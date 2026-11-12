"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef } from "react";

import { CartLineItem } from "@/components/cart/cart-line-item";
import {
  CartDiscounts,
  CartErrorBanner,
  CartNote,
  CartTotals,
  CheckoutButton,
} from "@/components/cart/cart-summary";
import { AnalyticsEvent, getAnalytics } from "@/lib/analytics";
import { useCart, useSuspenseCart } from "@/lib/cart";
import { CART_DRAWER_ID, closeCartDrawer } from "@/lib/cart-drawer";

/**
 * The cart drawer, rendered once in the root layout so it is available on every
 * page. It is progressive enhancement layered over the `/cart` route, which
 * stays the full-page fallback.
 *
 * Three layout zones: a header that never scrolls, a body that is the only
 * scrolling region, and a footer pinned to the bottom. `<dialog>` +
 * `showModal()` provides focus containment, focus restoration, Escape
 * dismissal, `::backdrop`, and `aria-modal` — none of which is reimplemented
 * here. `closedby="any"` adds native backdrop light-dismiss.
 */
export function CartDrawer() {
  return (
    <dialog
      id={CART_DRAWER_ID}
      aria-labelledby="cart-drawer-title"
      closedby="any"
      className="flex flex-col"
    >
      <DrawerOpenAnalytics />
      <div className="flex h-full flex-col">
        {/* Header — always visible, even while the cart is loading. */}
        <header className="flex items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <h2 id="cart-drawer-title" className="text-lg font-semibold">
            Cart
          </h2>
          <CartCountBadge />
          <button
            type="button"
            aria-label="Close cart"
            onClick={closeCartDrawer}
            className="ml-auto rounded-full p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <Suspense fallback={<DrawerLoading />}>
          <DrawerBody />
        </Suspense>
      </div>
    </dialog>
  );
}

function CartCountBadge() {
  const totalQuantity = useCart((state) => state.data.totalQuantity);
  if (!totalQuantity) return null;

  return (
    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
      {totalQuantity} {totalQuantity === 1 ? "item" : "items"}
    </span>
  );
}

function DrawerBody() {
  const cart = useSuspenseCart((state) => state.data);
  const lines = cart.lines?.nodes ?? [];

  if (lines.length === 0) {
    return (
      // Empty state: body message only, footer hidden entirely.
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-neutral-600 dark:text-neutral-400">Your cart is empty</p>
        <Link
          href="/collections"
          onClick={closeCartDrawer}
          className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white dark:bg-neutral-50 dark:text-neutral-900"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Body — the only scrolling zone. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5">
        <div className="py-3">
          <CartErrorBanner />
        </div>
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {lines.map((line) => (
            // Same Hydrogen line-item form contract as the /cart page: the
            // component is literally shared, only `compact` differs.
            <CartLineItem key={line.id} line={line} compact />
          ))}
        </ul>
      </div>

      {/* Footer — pinned, never scrolls. */}
      <footer className="space-y-5 border-t border-neutral-200 px-5 py-4 dark:border-neutral-800">
        <CartDiscounts />
        <details className="text-sm">
          <summary className="cursor-pointer text-neutral-600 dark:text-neutral-400">
            Add an order note
          </summary>
          <div className="mt-3">
            <CartNote />
          </div>
        </details>
        <CartTotals compact />
        <CheckoutButton />
        <Link
          href="/cart"
          onClick={closeCartDrawer}
          className="block text-center text-xs text-neutral-500 underline-offset-2 hover:underline"
        >
          View full cart
        </Link>
      </footer>
    </>
  );
}

/** Title and close button stay available; the loading status is announced. */
function DrawerLoading() {
  return (
    <div className="flex-1 space-y-5 px-5 py-6" role="status" aria-live="polite">
      <span className="sr-only">Loading cart…</span>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex gap-4">
          <div className="h-25 w-20 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
          <div className="flex-1 space-y-3 py-1">
            <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-8 w-32 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Publishes `cart_viewed` when the drawer opens.
 *
 * It listens to the dialog's native `toggle` event rather than mirroring open
 * state into React, so opening from any of the three surfaces (the trigger,
 * `window.Shopify.actions.openCart()`, add-to-cart) is covered by one listener.
 */
function DrawerOpenAnalytics() {
  const cartData = useCart((state) => state.data);
  const latest = useRef(cartData);

  // Keep the ref current without writing to it during render.
  useEffect(() => {
    latest.current = cartData;
  }, [cartData]);

  useEffect(() => {
    const drawer = document.getElementById(CART_DRAWER_ID);
    if (!(drawer instanceof HTMLDialogElement)) return;

    function onToggle(event: Event) {
      if ((event as ToggleEvent).newState !== "open") return;
      const cart = latest.current;
      getAnalytics()?.publish(AnalyticsEvent.CART_VIEWED, {
        cart: (cart?.id && cart.updatedAt ? cart : null) as never,
      });
    }

    drawer.addEventListener("toggle", onToggle);
    return () => drawer.removeEventListener("toggle", onToggle);
  }, []);

  return null;
}
