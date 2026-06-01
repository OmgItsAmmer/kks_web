/**
 * Fetches public storefront URLs from the KKS API for sitemap generation.
 */

const DEFAULT_API_BASE_URL = 'https://api.kks-online.com';

function getApiBaseUrl() {
  if (process.env.SITEMAP_API_BASE_URL) {
    return process.env.SITEMAP_API_BASE_URL.replace(/\/$/, '');
  }

  const viteApiBaseUrl = process.env.VITE_API_BASE_URL;
  if (viteApiBaseUrl && !/localhost|127\.0\.0\.1/i.test(viteApiBaseUrl)) {
    return viteApiBaseUrl.replace(/\/$/, '');
  }

  return DEFAULT_API_BASE_URL;
}

function toIsoDate(value) {
  if (!value) {
    return new Date().toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${url}`);
  }

  return response.json();
}

async function fetchAllProducts(apiBaseUrl) {
  const products = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = `${apiBaseUrl}/api/v1/products?page=${page}&pageSize=100`;
    const payload = await fetchJson(url);

    if (Array.isArray(payload?.data)) {
      products.push(...payload.data);
    }

    totalPages = payload?.pagination?.totalPages ?? page;
    page += 1;
  }

  return products.filter((product) => product.isVisible !== false);
}

async function fetchAllCollections(apiBaseUrl) {
  const collections = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = `${apiBaseUrl}/api/v1/collections?page=${page}&pageSize=100`;
    const payload = await fetchJson(url);

    if (Array.isArray(payload?.data)) {
      collections.push(...payload.data);
    }

    totalPages = payload?.pagination?.totalPages ?? page;
    page += 1;
  }

  return collections;
}

async function fetchSitemapUrls() {
  const apiBaseUrl = getApiBaseUrl();
  const today = new Date().toISOString();

  const staticRoutes = [
    { loc: '/', changefreq: 'daily', priority: 1.0, lastmod: today },
    { loc: '/products', changefreq: 'daily', priority: 0.9, lastmod: today },
  ];

  try {
    const [products, collections] = await Promise.all([
      fetchAllProducts(apiBaseUrl),
      fetchAllCollections(apiBaseUrl),
    ]);

    const productRoutes = products.map((product) => ({
      loc: `/product/${product.product_id}`,
      changefreq: 'weekly',
      priority: 0.8,
      lastmod: toIsoDate(product.updated_at ?? product.created_at),
    }));

    const collectionRoutes = collections.map((collection) => ({
      loc: `/collection/${collection.collection_id}`,
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: toIsoDate(collection.updated_at ?? collection.created_at),
    }));

    console.log(
      `[sitemap] Loaded ${productRoutes.length} products and ${collectionRoutes.length} collections from ${apiBaseUrl}`,
    );

    return [...staticRoutes, ...productRoutes, ...collectionRoutes];
  } catch (error) {
    console.warn(
      `[sitemap] API fetch failed (${error.message}). Falling back to static routes only.`,
    );
    return staticRoutes;
  }
}

module.exports = {
  fetchSitemapUrls,
  getApiBaseUrl,
};
