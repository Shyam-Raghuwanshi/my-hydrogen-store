import type { Metadata } from "next";
import { Suspense } from "react";

import { CartStaticView } from "@/components/cart/cart-static-view";
import { CartView } from "@/components/cart/cart-view";
import { readCart } from "@/lib/cart-read";

export const metadata: Metadata = {
  title: "Cart",
  description: "Review the items in your cart.",
  robots: { index: false, follow: false },
};

/**
 * The full cart page, and the no-JS fallback for the cart drawer.
 *
 * The cart is read on the server and rendered into the initial HTML, so this
 * page shows the shopper's real cart — or the empty state — with JavaScript
 * disabled. A `/cart` page whose only data source is a client `useCart` read
 * would render "Your cart is empty" without JS even when the cart has items.
 */
export default function CartPage() {
  return (
    <Suspense fallback={null}>
      <CartPageContent />
    </Suspense>
  );
}

async function CartPageContent() {
  const { cart } = await readCart();

  return <CartView fallback={<CartStaticView cart={cart} />} />;
}
