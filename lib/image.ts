/**
 * Hydrogen ships no Image component. These helpers size Shopify CDN image URLs
 * so plain `<img>` elements can request right-sized assets.
 */

export type ShopifyImageOptions = {
  width?: number;
  height?: number;
  crop?: "center" | "top" | "bottom" | "left" | "right";
};

const SHOPIFY_CDN_HOSTS = ["cdn.shopify.com", "mock.shop"];

function isShopifyImageHost(hostname: string) {
  return SHOPIFY_CDN_HOSTS.some(
    (host) => hostname === host || hostname.endsWith(`.${host}`),
  );
}

/**
 * Appends CDN sizing params, but only for Shopify-hosted images. Third-party
 * images (an Unsplash hero with its own `w=`) pass through untouched, and params
 * are set via `searchParams` so any existing query string survives.
 */
export function shopifyImageUrl(url: string, options: ShopifyImageOptions = {}) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  if (!isShopifyImageHost(parsed.hostname)) return url;

  if (options.width) parsed.searchParams.set("width", String(options.width));
  if (options.height) parsed.searchParams.set("height", String(options.height));
  if (options.crop) parsed.searchParams.set("crop", options.crop);

  return parsed.toString();
}

/** Builds a 1x/2x `srcSet` for retina displays. */
export function srcSetFor(url: string, options: ShopifyImageOptions) {
  const oneX = shopifyImageUrl(url, options);
  const twoX = shopifyImageUrl(url, {
    ...options,
    width: options.width ? options.width * 2 : undefined,
    height: options.height ? options.height * 2 : undefined,
  });

  return `${oneX} 1x, ${twoX} 2x`;
}
