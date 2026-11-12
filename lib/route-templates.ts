import { defineShopifyRouteTemplates } from "@shopify/hydrogen";

/**
 * Shopify standard storefront routes are all handled at their default paths by
 * this app:
 *
 *   /products/:productHandle      -> app/products/[handle]/page.tsx
 *   /collections                  -> app/collections/page.tsx
 *   /collections/:collectionHandle-> app/collections/[handle]/page.tsx
 *   /search                       -> app/search/page.tsx
 *   /cart                         -> app/cart/page.tsx
 *
 * So the manifest stays empty. Add entries here if the app ever moves a Shopify
 * resource or utility page to a custom pathname, and the same object will keep
 * `handleShopifyRoutes`, `handleShopifyRedirects`, `ShopifyScripts`, and
 * predictive search links in agreement.
 */
export const routeTemplates = defineShopifyRouteTemplates({});
