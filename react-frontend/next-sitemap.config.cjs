const { fetchSitemapUrls } = require('./scripts/fetch-sitemap-urls.cjs');

const SITE_URL = (process.env.SITE_URL || 'https://www.kks-online.com').replace(/\/$/, '');

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: SITE_URL,
  output: 'export',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  changefreq: 'weekly',
  priority: 0.7,
  outDir:
    process.env.SITEMAP_OUT_DIR ??
    (process.env.npm_lifecycle_event === 'postbuild' ? './dist' : './public'),
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: ['/', '/product/', '/products', '/collection/'],
        disallow: ['/cart$', '/checkout$', '/wishlist$', '/orders$', '/orders/'],
      },
    ],
    transformRobotsTxt: async (_, robotsTxt) =>
      robotsTxt
        .split('\n')
        .filter((line) => !line.startsWith('Host:') && line.trim() !== '# Host')
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trimEnd() + '\n',
  },
  additionalPaths: async () => fetchSitemapUrls(),
};
