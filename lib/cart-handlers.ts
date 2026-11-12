import "server-only";

import { createCartServerHandlers } from "@shopify/hydrogen";

import { customerSession } from "@/lib/customer-session";

/**
 * The single cart server handler instance for the app.
 *
 * It is registered with `handleShopifyRoutes` in `proxy.ts` to serve
 * `/api/cart`, read on the server to seed `CartProvider`, and used as the type
 * source for the React cart bindings in `lib/cart.ts`. One instance keeps all
 * three in agreement.
 *
 * When the Customer Account API is configured, the handlers are created with
 * the same `customerSession` as the account handlers so Hydrogen keeps cart
 * buyer identity in step with the signed-in customer. With mock.shop there is
 * no Customer Account API, so they are created without it.
 *
 * To add custom cart fields, pass `fragment` with a fragment named
 * `CartFragment`; the React bindings pick the new fields up automatically.
 */
export const cartHandlers = customerSession
  ? createCartServerHandlers({ customerSession })
  : createCartServerHandlers({});

export type CartHandlers = typeof cartHandlers;
