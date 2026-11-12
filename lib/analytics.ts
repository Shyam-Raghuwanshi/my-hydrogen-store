import { AnalyticsEvent, type StorefrontAnalytics } from "@shopify/hydrogen";

export { AnalyticsEvent };

/**
 * One analytics bus per page lifetime, read lazily on the client.
 *
 * `ShopifyScripts` owns construction and puts the bus on
 * `window.Shopify.analytics`; this module only reads it. It deliberately reads
 * no environment variables — `shopId`, `storefrontId`, `myshopifyDomain`,
 * `country` and `language` are resolved on the server and passed into
 * `ShopifyScripts`.
 *
 * Returns `null` during SSR, and also when `ShopifyScripts` is not rendered at
 * all (the mock.shop path, which has no shop ID), so every tracker below
 * degrades to a no-op instead of throwing.
 */
let bus: StorefrontAnalytics | null = null;

export function getAnalytics(): StorefrontAnalytics | null {
  if (typeof window === "undefined") return null;
  if (bus) return bus;
  bus = window.Shopify?.analytics ?? null;
  return bus;
}
