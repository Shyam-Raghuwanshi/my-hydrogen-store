import "server-only";

import { createShopifyRequestContext } from "@shopify/hydrogen";
import { cookies, headers } from "next/headers";

import { cartHandlers } from "@/lib/cart-handlers";
import {
  customerSession,
  getReadonlyCustomerSessionManager,
  SESSION_COOKIE,
} from "@/lib/customer-session";
import { i18n } from "@/lib/i18n";
import { getStorefrontClient } from "@/lib/storefront";

export type CartData = Awaited<ReturnType<typeof cartHandlers.get>>["data"];

/**
 * Reads the current cart on the server so `CartProvider` can be seeded with it.
 *
 * This matters for more than speed: a `/cart` page whose only data source is a
 * client `useCart` read renders "Your cart is empty" without JavaScript even
 * when the shopper has items.
 *
 * Returns the full handler envelope (`{ cart, errors? }`) — not `data.cart`.
 * `{ cart: null }` tells the client the server already looked and found no
 * usable cart; omitting `initialData` entirely would instead make the browser
 * fetch `/api/cart` after hydration.
 */
export async function readCart(): Promise<CartData> {
  const storefrontClient = await getStorefrontClient();

  // The handlers created *with* `customerSession` additionally check the
  // customer's login state, so they need the session manager and request
  // context. Building one context object for both shapes keeps this a single
  // call; the extra fields are ignored when there is no customer session.
  const requestContext = createShopifyRequestContext({
    request: { headers: await headers() },
    i18n,
  });
  const sessionManager = await getReadonlyCustomerSessionManager(
    customerSession ? (await cookies()).get(SESSION_COOKIE)?.value : undefined,
  );

  const context = { storefrontClient, sessionManager, requestContext };
  const { data } = await cartHandlers.get(context);
  return data;
}
