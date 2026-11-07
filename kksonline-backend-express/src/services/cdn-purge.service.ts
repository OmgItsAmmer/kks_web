import { config } from '../config/env.config';
import { logger } from '../utils/logger';

/**
 * Tells Cloudflare to forget cached catalog responses after an admin change (plan 4.8).
 * Best effort: the cache also expires by itself within 60 seconds, so a failure is only logged.
 */
export const purgeCatalogCache = async (): Promise<void> => {
  const { zoneId, apiToken } = config.cloudflare;
  if (!zoneId || !apiToken) return;
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ purge_everything: true }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) logger.warn('Cloudflare cache purge failed', { status: res.status });
  } catch (error) {
    logger.warn('Cloudflare cache purge error', { error });
  }
};
