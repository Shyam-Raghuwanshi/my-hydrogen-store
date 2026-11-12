"use client";

import { useCart } from "@/lib/cart";
import { CART_DRAWER_ID, openCartDrawer } from "@/lib/cart-drawer";

/**
 * The canonical cart trigger.
 *
 * It server-renders as a plain `<a href="/cart">`, so it works before
 * hydration and without JavaScript by navigating to the full cart page. After
 * hydration the `onClick` cancels that navigation and opens the drawer — the
 * anchor is the baseline, the handler is the enhancement, so no "has hydrated"
 * swap is needed.
 */
export function CartTrigger({ showCount = true }: { showCount?: boolean }) {
  return (
    <a
      href="/cart"
      onClick={(event) => {
        event.preventDefault();
        openCartDrawer();
      }}
      aria-controls={CART_DRAWER_ID}
      aria-haspopup="dialog"
      className="relative inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12A1.125 1.125 0 0119.75 21.75H4.25a1.125 1.125 0 01-1.119-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z"
        />
      </svg>
      <span>Cart</span>
      {/*
        The count reads cart state, so it is omitted in the layout's pre-cart
        fallback chrome, which renders outside `CartProvider`.
      */}
      {showCount ? <CartCount /> : null}
    </a>
  );
}

/**
 * The quantity badge. It reads the non-blocking `useCart` selector, so the
 * header never waits on cart contents to render.
 */
function CartCount() {
  const totalQuantity = useCart((state) => state.data.totalQuantity);
  if (!totalQuantity) return null;

  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-900 px-1.5 text-[11px] font-semibold text-white dark:bg-neutral-50 dark:text-neutral-900">
      {totalQuantity}
      <span className="sr-only"> items in cart</span>
    </span>
  );
}
