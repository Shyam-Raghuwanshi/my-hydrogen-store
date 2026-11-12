"use client";

import type { ShopifyScriptsI18n, ShopifyScriptsShop } from "@shopify/hydrogen";
import { ShopifyScripts } from "@shopify/hydrogen/react";
import { useRouter } from "next/navigation";

import { routeTemplates } from "@/lib/route-templates";

/**
 * Shopify's browser runtime, rendered exactly once in the root document.
 *
 * The cart store sends every mutation through `window.Shopify.actions` and
 * listens for its events, so without this the cart rejects with "Standard
 * Actions not available".
 *
 * `shop` and `i18n` are resolved on the server and arrive as serialized props;
 * this component reads no environment variables. It is a client component
 * because `navigate` is a function, which cannot cross the server/client
 * boundary.
 */
export function ShopifyRuntime({
  shop,
  i18n,
}: {
  shop: ShopifyScriptsShop | null;
  i18n: ShopifyScriptsI18n;
}) {
  const router = useRouter();

  // Without a shop ID (mock.shop) load only the Standard Actions module, so the
  // cart still works while Shopify's analytics/account scripts stay off.
  if (!shop) {
    return (
      <script
        async
        type="module"
        src="https://cdn.shopify.com/storefront/standard-actions.js"
      />
    );
  }

  return (
    <ShopifyScripts
      shop={shop}
      i18n={i18n}
      // The shared manifest, so Shopify's browser modules and agent tools
      // resolve storefront URLs through this app's URL shape.
      routes={routeTemplates}
      // Lets Shopify utilities (WebMCP among them) route through Next instead
      // of doing a full page load.
      navigate={(url) => router.push(url)}
      /*
       * Shopify's hosted privacy banner. The analytics bus gates every
       * destination on the Customer Privacy API, so nothing is delivered until
       * analytics processing is allowed for that visitor. Switch to
       * `mode: "custom-banner"` with a `setup` callback to drive this from a
       * third-party consent provider instead.
       */
      consent={{ mode: "default-banner" }}
    />
  );
}
