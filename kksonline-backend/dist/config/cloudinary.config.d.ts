import { v2 as cloudinary } from 'cloudinary';
export { cloudinary };
export declare const CLOUDINARY_FOLDERS: {
    readonly products: "kksonline/products";
    readonly brands: "kksonline/brands";
    readonly categories: "kksonline/categories";
    readonly customers: "kksonline/customers";
    readonly banners: "kksonline/banners";
    readonly misc: "kksonline/misc";
};
export type CloudinaryFolder = keyof typeof CLOUDINARY_FOLDERS;
export declare const UPLOAD_PRESETS: {
    readonly product: {
        readonly folder: "kksonline/products";
        readonly transformation: readonly [{
            readonly width: 800;
            readonly height: 800;
            readonly crop: "limit";
            readonly quality: "auto:good";
        }];
        readonly format: "webp";
    };
    readonly thumbnail: {
        readonly folder: "kksonline/products";
        readonly transformation: readonly [{
            readonly width: 200;
            readonly height: 200;
            readonly crop: "fill";
            readonly quality: "auto:eco";
        }];
        readonly format: "webp";
    };
    readonly brand: {
        readonly folder: "kksonline/brands";
        readonly transformation: readonly [{
            readonly width: 400;
            readonly height: 400;
            readonly crop: "limit";
            readonly quality: "auto:good";
        }];
        readonly format: "webp";
    };
    readonly category: {
        readonly folder: "kksonline/categories";
        readonly transformation: readonly [{
            readonly width: 600;
            readonly height: 400;
            readonly crop: "fill";
            readonly quality: "auto:good";
        }];
        readonly format: "webp";
    };
    readonly profile: {
        readonly folder: "kksonline/customers";
        readonly transformation: readonly [{
            readonly width: 300;
            readonly height: 300;
            readonly crop: "fill";
            readonly gravity: "face";
            readonly quality: "auto:good";
        }];
        readonly format: "webp";
    };
};
//# sourceMappingURL=cloudinary.config.d.ts.map