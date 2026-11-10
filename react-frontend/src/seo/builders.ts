// Pure functions that build SEO text and schema.org objects. No React in here, so they are easy to test.
import { LOGO_URL, SITE_NAME, SITE_URL } from './config';

export type JsonLd = Record<string, unknown>;

export const absoluteUrl = (pathOrUrl: string): string => (/^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : `${SITE_URL}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`);

/** Removes HTML tags and extra spaces from text that came from the database. */
export const cleanText = (value: string | null | undefined): string =>
  (value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

/** Cuts text to about `max` characters at a word boundary (search engines show roughly 150 to 160). */
export const truncate = (text: string, max = 158): string => {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.-]+$/, '')}…`;
};

const rs = (n: number): string => `Rs ${Math.round(n).toLocaleString('en-US')}`;

interface ProductSeoInput {
  name: string;
  description?: string | null;
  categoryName?: string | null;
  brandName?: string | null;
  minPrice?: number | null;
  inStock?: boolean;
}

/**
 * A description that is unique to the product. The database description is used when it is long enough to say
 * something ("New" or "." is not); otherwise one is written from the product's own facts (name, brand, category, price).
 */
export const productDescription = ({ name, description, categoryName, brandName, minPrice, inStock = true }: ProductSeoInput): string => {
  const own = cleanText(description);
  if (own.length >= 50) return truncate(own);
  const parts = [
    `${categoryName ? `${categoryName}: ` : ''}Buy ${name}${brandName ? ` by ${brandName}` : ''} online from ${SITE_NAME}.`,
    minPrice && minPrice > 0 ? `Price from ${rs(minPrice)}.` : '',
    inStock ? 'In stock with delivery across Pakistan.' : 'Currently out of stock.',
    'Quality karyana since 1995.',
  ];
  return truncate(parts.filter(Boolean).join(' '));
};

export const productTitle = (name: string): string => `${name} Price in Pakistan | ${SITE_NAME}`;

export const breadcrumbJsonLd = (items: { name: string; path: string }[]): JsonLd => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
});

interface ProductJsonLdInput {
  id: number;
  name: string;
  description: string;
  images: string[];
  sku?: string | null;
  brandName?: string | null;
  categoryName?: string | null;
  prices: number[];
  inStock: boolean;
  rating?: number | null;
  reviewCount?: number | null;
}

export const productJsonLd = (p: ProductJsonLdInput): JsonLd => {
  const url = absoluteUrl(`/product/${p.id}`);
  const prices = p.prices.filter((x) => Number.isFinite(x) && x > 0);
  const availability = `https://schema.org/${p.inStock ? 'InStock' : 'OutOfStock'}`;
  const low = prices.length ? Math.min(...prices) : null;
  const high = prices.length ? Math.max(...prices) : null;

  const offers: JsonLd | undefined =
    low === null
      ? undefined
      : low === high
        ? { '@type': 'Offer', url, priceCurrency: 'PKR', price: low.toFixed(2), availability, itemCondition: 'https://schema.org/NewCondition', seller: { '@type': 'Organization', name: SITE_NAME } }
        : { '@type': 'AggregateOffer', url, priceCurrency: 'PKR', lowPrice: low.toFixed(2), highPrice: (high as number).toFixed(2), offerCount: prices.length, availability, itemCondition: 'https://schema.org/NewCondition', seller: { '@type': 'Organization', name: SITE_NAME } };

  const data: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: p.name,
    description: p.description,
    url,
  };
  if (p.images.length) data.image = p.images;
  if (p.sku) data.sku = p.sku;
  if (p.brandName) data.brand = { '@type': 'Brand', name: p.brandName };
  if (p.categoryName) data.category = p.categoryName;
  if (offers) data.offers = offers;
  // Only report ratings when there are real reviews (Google rejects invented ones)
  if (p.rating && p.reviewCount && p.reviewCount > 0) {
    data.aggregateRating = { '@type': 'AggregateRating', ratingValue: Number(p.rating).toFixed(1), reviewCount: p.reviewCount };
  }
  return data;
};

/** The store itself. Also written statically into index.html for crawlers that do not run JavaScript. */
export const storeJsonLd = (description: string, telephone: string, email: string): JsonLd[] => [
  {
    '@context': 'https://schema.org',
    '@type': ['GroceryStore', 'Organization'],
    '@id': `${SITE_URL}/#store`,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: LOGO_URL,
    image: `${SITE_URL}/og-image.jpg`,
    description,
    foundingDate: '1995',
    telephone,
    email,
    areaServed: { '@type': 'Country', name: 'Pakistan' },
    address: { '@type': 'PostalAddress', addressCountry: 'PK' },
    priceRange: 'Rs',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    publisher: { '@id': `${SITE_URL}/#store` },
    potentialAction: { '@type': 'SearchAction', target: `${SITE_URL}/search?q={search_term_string}`, 'query-input': 'required name=search_term_string' },
  },
];
