import { purgeCatalogCache } from '../../../services/cdn-purge.service';
import { clearCache } from '../../../utils/cache';

/**
 * After an admin changes anything the storefront shows: drop the API's in-memory cache and ask
 * Cloudflare to forget its copies (plan 4.8). The purge is best effort and never delays the response.
 */
export const invalidateCatalog = (): void => {
  clearCache();
  void purgeCatalogCache();
};
