// Site-wide SEO constants. The same defaults are written into index.html (for crawlers that do not run JavaScript),
// so keep the two in step.
export const SITE_URL = ((import.meta.env.VITE_SITE_URL as string | undefined) || 'https://www.kks-online.com').replace(/\/+$/, '');
export const SITE_NAME = 'KKS Online';

export const STORE_FULL_NAME = 'Kashif Karyana Store';
export const STORE_OTHER_NAMES = ['Kashif Karyana Store', 'KKS', 'KKS Karyana'];
export const DEFAULT_TITLE = 'Kashif Karyana Store | KKS Online Grocery in Pakistan';
export const DEFAULT_DESCRIPTION =
  'Order daily grocery items online from KKS Online. Serving quality karyana, household essentials, and pantry staples in Pakistan since 1995.';

export const OG_IMAGE_URL = `${SITE_URL}/og-image.jpg`;
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const LOGO_URL = `${SITE_URL}/icon-512.png`;

export const CONTACT = {
  telephone: '+923022500085',
  email: 'hello@kksonline.com.pk',
};
