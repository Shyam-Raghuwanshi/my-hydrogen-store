"use client";

import type { ReactNode } from "react";

import { CartProvider } from "@/lib/cart";
import type { CartData } from "@/lib/cart-read";

/**
 * `initialData` receives the *unresolved* cart promise. `CartProvider` tracks
 * it so the static app shell streams immediately while `useSuspenseCart()`
 * suspends only the cart views behind their own fallback.
 */
export function Providers({
  cartData,
  children,
}: {
  cartData: Promise<CartData>;
  children: ReactNode;
}) {
  return <CartProvider initialData={cartData}>{children}</CartProvider>;
}
