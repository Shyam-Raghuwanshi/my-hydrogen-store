import "server-only";

import type { ShopifyScriptsI18n, ShopifyScriptsShop } from "@shopify/hydrogen";

import { i18n } from "@/lib/i18n";
import { storeDomain } from "@/lib/storefront";

/**
 * The `shop` and `i18n` values for `ShopifyScripts`, resolved server-side and
 * annotated with Hydrogen's own types so a wrong or missing field fails here
 * rather than at the distant component call site.
 *
 * Client components never read env for these — they arrive as serialized props.
 */

const shopId = process.env.SHOP_ID;

/**
 * `ShopifyScripts` needs a real numeric shop ID. mock.shop has none, so the
 * storefront falls back to loading only Shopify's Standard Actions module,
 * which is what the cart store actually requires. See
 * `components/shopify-runtime.tsx`.
 */
export const shopifyScriptsShop: ShopifyScriptsShop | null = shopId
  ? {
      // The shop itself: numeric ID or Shop GID.
      shopId,
      // This specific headless storefront instance; "0" when unprovisioned.
      storefrontId: process.env.NEXT_PUBLIC_STOREFRONT_ID || "0",
      // The shop's permanent *.myshopify.com domain; becomes window.Shopify.shop.
      myshopifyDomain: storeDomain,
    }
  : null;

/**
 * The same resolved locale the Storefront API requests use — not the
 * `defineShopifyI18n` definition and not a locale string.
 *
 * This is a single-locale storefront, so it is read from the definition's
 * default. A market-aware store should pass `requestContext.locale` through
 * from the server boundary instead.
 */
export const shopifyScriptsI18n: ShopifyScriptsI18n = {
  country: i18n.defaultLocale.country,
  language: i18n.defaultLocale.language,
  pathPrefix: "",
};
