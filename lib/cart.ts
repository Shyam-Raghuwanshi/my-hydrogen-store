"use client";

import { createCartComponents } from "@shopify/hydrogen/react";

import type { CartHandlers } from "@/lib/cart-handlers";

/**
 * React cart bindings, derived once from the cart server handlers so the client
 * store's types match what `/api/cart` actually returns.
 *
 * Only the `type` is imported from the server-only handlers module, so no
 * server code is pulled into the browser bundle.
 */
export const {
  CartProvider,
  useCart,
  useSuspenseCart,
  useCartActions,
  useCartForm,
} = createCartComponents<CartHandlers>();
