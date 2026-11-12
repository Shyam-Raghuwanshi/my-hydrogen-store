import "server-only";

import { createShopifyRequestContext, createStorefrontClient } from "@shopify/hydrogen";
import { headers } from "next/headers";
import { cache } from "react";

import { i18n } from "@/lib/i18n";

/**
 * The Shopify store domain. Defaults to the tokenless `mock.shop` apparel
 * catalog so the storefront runs before a real store is connected.
 */
export const storeDomain = process.env.NEXT_PUBLIC_STORE_DOMAIN || "mock.shop";

/**
 * Request-scoped Storefront API client for Server Components.
 *
 * `cache()` keeps one client per RSC request. Reading `headers()` makes the
 * calling page dynamic, and carries the original URL through the
 * `x-storefront-url` header that `proxy.ts` forwards, so the request context
 * can resolve the locale.
 *
 * Public client by default: `NEXT_PUBLIC_STOREFRONT_API_TOKEN` may be unset,
 * which means tokenless access — all mock.shop supports. Once this app targets
 * a real store with a private token and trusted buyer context, switch to
 * `type: "private"` and resolve `buyerIp` from trusted deployment headers.
 */
export const getStorefrontClient = cache(async () => {
  const requestHeaders = await headers();
  const requestContext = createShopifyRequestContext({
    request: { headers: requestHeaders },
    i18n,
  });

  return createStorefrontClient({
    type: "public",
    requestContext,
    config: {
      storeDomain,
      publicStorefrontToken: process.env.NEXT_PUBLIC_STOREFRONT_API_TOKEN,
    },
  });
});
