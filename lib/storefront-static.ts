import "server-only";

import { createShopifyRequestContext, createStorefrontClient } from "@shopify/hydrogen";

import { i18n } from "@/lib/i18n";
import { storeDomain } from "@/lib/storefront";

/**
 * Module-scope Storefront API client for catalog reads that are identical for
 * every visitor (collection grids, product detail, marketing content).
 *
 * It is safe at module scope because its request context uses static headers
 * and an explicitly pinned locale — there is no request URL to match a locale
 * from. All callers share one throttle bucket, so only use it for data that
 * does not vary per buyer, and always behind a `"use cache"` cache-point.
 *
 * This is a tokenless/public client because that is all mock.shop supports.
 * Once `PRIVATE_STOREFRONT_API_TOKEN` is available, switch `type` to
 * `"private_no_buyer_context"` and pass `privateStorefrontToken` instead — the
 * query code does not change.
 */
const requestContext = createShopifyRequestContext({
  request: { headers: new Headers() },
  i18n,
  locale: i18n.defaultLocale,
});

export const staticStorefrontClient = createStorefrontClient({
  type: "public",
  requestContext,
  config: {
    storeDomain,
    publicStorefrontToken: process.env.NEXT_PUBLIC_STOREFRONT_API_TOKEN,
  },
});
