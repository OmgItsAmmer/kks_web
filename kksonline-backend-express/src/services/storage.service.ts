import crypto from 'node:crypto';
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { config } from '../config/env.config';
import { logger } from '../utils/logger';
import { BadRequestError, InternalServerError } from '../utils/errors';

/**
 * Cloudflare R2 access (plan 4.3).
 *  - kks-public:  catalog images, served through the CDN domain (ASSET_BASE_URL), cached for a year.
 *  - kks-private: payment receipts, customer files, backups. Only signed, short-lived URLs.
 * The object key is simply `<folderType>/<filename>`, exactly what the `images` table already stores.
 */

/** Folders (the `images.folderType` value) whose files must never be public. */
export const PRIVATE_FOLDERS = new Set<string>(['customers', 'payment-receipts']);

export const IMAGE_MAX_SIDE = 1600;
export const THUMB_SIDE = 400;
export const SIGNED_URL_TTL_SECONDS = 60 * 60;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';

let client: S3Client | null = null;

export const isStorageConfigured = (): boolean =>
  Boolean(config.r2.accountId && config.r2.accessKeyId && config.r2.secretAccessKey);

const getClient = (): S3Client => {
  if (!isStorageConfigured()) {
    throw new InternalServerError('Object storage (R2) is not configured');
  }
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.r2.accessKeyId as string,
        secretAccessKey: config.r2.secretAccessKey as string,
      },
    });
  }
  return client;
};

export const bucketFor = (folder: string): string =>
  PRIVATE_FOLDERS.has(folder) ? config.r2.privateBucket : config.r2.publicBucket;

export const objectKey = (folder: string, filename: string): string =>
  `${folder}/${filename.replace(/^\/+/, '')}`;

/** Public URL for a file in a public folder. Used for every catalog image. */
export const assetUrl = (folder: string, filename: string): string => {
  const base = config.r2.assetBaseUrl ?? '';
  return `${base}/${objectKey(folder, filename)}`;
};

/** `abc.webp` -> `abc_400.webp`: the pre-generated thumbnail next to an image. */
export const thumbFilename = (filename: string): string => filename.replace(/(\.[a-z0-9]+)$/i, `_${THUMB_SIDE}$1`);

export const putObject = async (
  folder: string,
  filename: string,
  body: Buffer,
  contentType: string,
  cacheControl: string | undefined = PRIVATE_FOLDERS.has(folder) ? undefined : IMMUTABLE_CACHE
): Promise<void> => {
  try {
    await getClient().send(
      new PutObjectCommand({
        Bucket: bucketFor(folder),
        Key: objectKey(folder, filename),
        Body: body,
        ContentType: contentType,
        CacheControl: cacheControl,
      })
    );
  } catch (error) {
    logger.error('R2 upload failed', { error, folder, filename });
    throw new InternalServerError('Failed to store file');
  }
};

export const deleteObject = async (folder: string | null, filename: string | null): Promise<void> => {
  if (!folder || !filename) return;
  try {
    await getClient().send(
      new DeleteObjectCommand({ Bucket: bucketFor(folder), Key: objectKey(folder, filename) })
    );
  } catch (error) {
    // A leftover file is harmless; a failed request must not block the database change.
    logger.error('R2 delete failed', { error, folder, filename });
  }
};

export const deleteObjects = async (folder: string, filenames: string[]): Promise<void> => {
  if (filenames.length === 0) return;
  try {
    await getClient().send(
      new DeleteObjectsCommand({
        Bucket: bucketFor(folder),
        Delete: { Objects: filenames.map((f) => ({ Key: objectKey(folder, f) })), Quiet: true },
      })
    );
  } catch (error) {
    logger.error('R2 bulk delete failed', { error, folder, count: filenames.length });
  }
};

export const objectExists = async (folder: string, filename: string): Promise<boolean> => {
  try {
    await getClient().send(
      new HeadObjectCommand({ Bucket: bucketFor(folder), Key: objectKey(folder, filename) })
    );
    return true;
  } catch {
    return false;
  }
};

export const signedUrl = async (
  folder: string,
  filename: string,
  ttlSeconds = SIGNED_URL_TTL_SECONDS
): Promise<string> => {
  try {
    return await getSignedUrl(
      getClient(),
      new GetObjectCommand({ Bucket: bucketFor(folder), Key: objectKey(folder, filename) }),
      { expiresIn: ttlSeconds }
    );
  } catch (error) {
    logger.error('R2 signing failed', { error, folder, filename });
    throw new InternalServerError('Failed to generate file URL');
  }
};

export const putPrivateRaw = async (key: string, body: Buffer | string, contentType: string): Promise<void> => {
  try {
    await getClient().send(
      new PutObjectCommand({ Bucket: config.r2.privateBucket, Key: key, Body: body, ContentType: contentType })
    );
  } catch (error) {
    logger.error('R2 private upload failed', { error, key });
    throw new InternalServerError('Failed to store file');
  }
};

// ---------------------------------------------------------------------------
// Image pipeline (plan 4.3): check by content, strip metadata, WebP, 1600 px, plus a 400 px thumbnail
// ---------------------------------------------------------------------------

const ALLOWED_INPUT_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif']);

export interface ProcessedImage {
  main: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
}

export const processImage = async (input: Buffer): Promise<ProcessedImage> => {
  if (input.length === 0) throw new BadRequestError('Empty file');
  if (input.length > MAX_UPLOAD_BYTES) throw new BadRequestError('Image is larger than 8 MB');

  let meta: { format?: string };
  try {
    meta = await sharp(input, { failOn: 'error' }).metadata();
  } catch {
    throw new BadRequestError('File is not a valid image');
  }
  // Decide by the real content, never by file name or declared type.
  if (!meta.format || !ALLOWED_INPUT_FORMATS.has(meta.format)) {
    throw new BadRequestError('Only JPEG, PNG, WebP or GIF images are allowed');
  }

  const base = sharp(input).rotate(); // apply EXIF orientation; metadata is dropped on output
  const main = await base
    .clone()
    .resize({ width: IMAGE_MAX_SIDE, height: IMAGE_MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  const thumb = await base
    .clone()
    .resize({ width: THUMB_SIDE, height: THUMB_SIDE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer();

  return { main: main.data, thumb, width: main.info.width, height: main.info.height };
};

export const randomImageName = (entityId: number): string =>
  `${entityId}/${Date.now()}-${crypto.randomUUID()}.webp`;
