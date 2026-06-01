const { fetchSitemapUrls } = require('./scripts/fetch-sitemap-urls.cjs');

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://kks-online.com',
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
        allow: '/',
        disallow: ['/cart', '/checkout', '/wishlist', '/orders', '/orders/*'],
      },
    ],
  },
  additionalPaths: async () => fetchSitemapUrls(),
};
