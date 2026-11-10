import { useEffect } from 'react';
import { absoluteUrl } from './builders';
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, OG_IMAGE_HEIGHT, OG_IMAGE_URL, OG_IMAGE_WIDTH, SITE_NAME } from './config';
import type { JsonLd } from './builders';

export interface SeoOptions {
  /** The full <title>. Keep it under about 60 characters. */
  title: string;
  /** The meta description. Keep it under about 160 characters. */
  description: string;
  /** Path (or full URL) that is the "official" address of this page. Used for canonical and og:url. */
  path?: string;
  /** Picture for social sharing. Defaults to the branded 1200 x 630 image. */
  image?: string | null;
  /** Page type for og:type. */
  type?: 'website' | 'product' | 'article';
  /** Keep this page out of search results (cart, checkout, account pages, search pages). */
  noindex?: boolean;
  /** Extra structured data (Product, BreadcrumbList, ...). */
  jsonLd?: JsonLd | JsonLd[];
}

type MetaAttr = 'name' | 'property';

const setMeta = (attr: MetaAttr, key: string, content: string | null): void => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (content === null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

const setCanonical = (href: string): void => {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
};

const JSONLD_ATTR = 'data-seo-jsonld';

const setJsonLd = (items: JsonLd[]): void => {
  document.head.querySelectorAll(`script[${JSONLD_ATTR}]`).forEach((n) => n.remove());
  for (const item of items) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute(JSONLD_ATTR, '');
    // "<" is escaped so that text from the database can never close the script tag
    script.text = JSON.stringify(item).replace(/</g, '\\u003c');
    document.head.appendChild(script);
  }
};

export const applySeo = (o: SeoOptions): void => {
  const url = absoluteUrl(o.path ?? (typeof window !== 'undefined' ? window.location.pathname : '/'));
  const image = o.image && /^https?:\/\//i.test(o.image) ? o.image : OG_IMAGE_URL;
  // A real product or collection picture has unknown size; only the branded image has the declared 1200 x 630
  const brandedImage = image === OG_IMAGE_URL;

  document.title = o.title;
  setMeta('name', 'description', o.description);
  setMeta('name', 'robots', o.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1');
  setCanonical(url);

  setMeta('property', 'og:site_name', SITE_NAME);
  setMeta('property', 'og:locale', 'en_PK');
  setMeta('property', 'og:type', o.type ?? 'website');
  setMeta('property', 'og:title', o.title);
  setMeta('property', 'og:description', o.description);
  setMeta('property', 'og:url', url);
  setMeta('property', 'og:image', image);
  setMeta('property', 'og:image:alt', o.title);
  setMeta('property', 'og:image:width', brandedImage ? String(OG_IMAGE_WIDTH) : null);
  setMeta('property', 'og:image:height', brandedImage ? String(OG_IMAGE_HEIGHT) : null);

  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', o.title);
  setMeta('name', 'twitter:description', o.description);
  setMeta('name', 'twitter:image', image);

  setJsonLd(o.jsonLd ? (Array.isArray(o.jsonLd) ? o.jsonLd : [o.jsonLd]) : []);
};

export const DEFAULT_SEO: SeoOptions = { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, path: '/' };

/**
 * Sets the page's title, description, canonical address, social tags and structured data.
 * Pass `null` while the page's data is still loading (the previous or default tags stay in place).
 * When the page is left, the site defaults are restored, so a page that does not call this one never keeps
 * another page's tags.
 */
export function useSeo(options: SeoOptions | null): void {
  const key = options ? JSON.stringify(options) : '';
  useEffect(() => {
    if (!options) return;
    applySeo(options);
    return () => applySeo(DEFAULT_SEO);
    // `key` captures every value in `options`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

/** For pages that belong to one customer (cart, checkout, orders, addresses): a clear title and never in search results. */
export function usePrivateSeo(title: string): void {
  useSeo({ title: `${title} | ${SITE_NAME}`, description: DEFAULT_DESCRIPTION, noindex: true });
}
