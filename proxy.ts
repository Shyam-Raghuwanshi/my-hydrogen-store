import {
  createShopifyRequestContext,
  createStorefrontClient,
  handleShopifyRoutes,
} from "@shopify/hydrogen";
import { createCustomerAccountServerHandlers } from "@shopify/hydrogen/customer-account";
import { NextResponse, type NextRequest } from "next/server";

import { cartHandlers } from "@/lib/cart-handlers";
import { createSessionManager, customerSession } from "@/lib/customer-session";
import { i18n } from "@/lib/i18n";
import { routeTemplates } from "@/lib/route-templates";
import { storeDomain } from "@/lib/storefront";

/**
 * Hydrogen's registered route handlers.
 *
 * `cartHandlers` is the shared instance from `lib/cart-handlers.ts`, which is
 * also read on the server to seed `CartProvider` and types the React cart
 * bindings.
 *
 * With a Customer Account API configuration the account handlers receive those
 * same cart handlers, so Hydrogen owns the whole buyer-identity loop: new carts
 * carry the signed-in customer, authorize and refresh attach them, logout
 * detaches them. Without it (mock.shop, which has no Customer Account API) only
 * the cart handlers are registered.
 */
function createCustomerAccountHandlers(session: NonNullable<typeof customerSession>) {
  const cartServerHandlers = cartHandlers as Parameters<
    typeof createCustomerAccountServerHandlers
  >[0]["cartServerHandlers"];

  try {
    // Safe: when `customerSession` is set, `cartHandlers` was created with it,
    // which is what cart buyer-identity sync requires.
    return createCustomerAccountServerHandlers({
      customerSession: session,
      cartServerHandlers,
    });
  } catch (error) {
    /*
     * Known `@shopify/hydrogen@2026.10.3` packaging issue, dev-mode only.
     *
     * Hydrogen brands the cart handlers with a module-local `Symbol(...)`. Its
     * export map gives `"."` a `development` condition (`dist/development/...`)
     * but gives `"./customer-account"` none (`dist/...`), so under a bundler
     * that applies the `development` condition the two entrypoints load two
     * copies of the shared internal module, the symbols differ, and this
     * throws. Production builds resolve both to `dist/...`, the symbols match,
     * and buyer-identity sync works.
     *
     * Degrade rather than crash the dev server: login, authorize, refresh and
     * logout all still work, only cart buyer-identity sync is skipped in dev.
     * Do not "fix" this with `serverExternalPackages` — that makes Next treat
     * Hydrogen's client components as server components and breaks
     * `ShopifyScripts` with "Cannot read properties of null (reading
     * 'useEffect')".
     */
    console.warn(
      "[hydrogen] Cart buyer-identity sync is disabled in this dev server " +
        "because @shopify/hydrogen's `.` and `./customer-account` entrypoints " +
        "resolved to different builds. Production builds are unaffected. " +
        `(${error instanceof Error ? error.message : String(error)})`,
    );
    return createCustomerAccountServerHandlers({ customerSession: session });
  }
}

const handlers = customerSession
  ? ([cartHandlers, createCustomerAccountHandlers(customerSession)] as const)
  : ([cartHandlers] as const);

export async function proxy(request: NextRequest) {
  const requestContext = createShopifyRequestContext({
    request,
    i18n,
  });

  const storefrontClient = createStorefrontClient({
    type: "public",
    requestContext,
    config: {
      storeDomain,
      publicStorefrontToken: process.env.NEXT_PUBLIC_STOREFRONT_API_TOKEN,
    },
  });

  const shopifyRoute = handleShopifyRoutes({
    request,
    requestContext,
    sessionManager: await createSessionManager(request),
    storefrontClient,
    routeTemplates,
    handlers,
  });

  // `handleShopifyRoutes` no-ops for app routes it does not own, so this is
  // returned directly (as a promise) and Next owns any rejection.
  if (shopifyRoute) return shopifyRoute;

  // Forward `x-storefront-url` so Server Components and `not-found.tsx` can
  // recover the original request URL.
  const response = NextResponse.next({
    request: { headers: requestContext.getForwardedRequestHeaders() },
  });
  requestContext.applyResponseHeaders(response.headers);
  return response;
}

export const config = {
  // Broad on purpose: `/admin`, `/api/cart`, `/checkout`, `/graphiql`, and the
  // SFAPI proxy must all reach `handleShopifyRoutes`. Only Next's static
  // assets are excluded.
  matcher: ["/((?!_next/static|_next/image|_next/data|favicon.ico).*)"],
};
