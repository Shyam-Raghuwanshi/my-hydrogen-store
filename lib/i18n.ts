import { defineShopifyI18n } from "@shopify/hydrogen";

/**
 * Single-locale storefront.
 *
 * Add `routing` here to serve more locales by path prefix or hostname — see the
 * `hydrogen-markets` skill. Declared once at module scope so every request
 * context (proxy, server components, route handlers) shares one definition.
 */
export const i18n = defineShopifyI18n({
  defaultLocale: { language: "EN", country: "US" },
});
