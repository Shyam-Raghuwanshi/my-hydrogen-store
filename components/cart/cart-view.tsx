"use client";

import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { CartViewedTracker } from "@/components/analytics/view-trackers";
import { CartLineItem } from "@/components/cart/cart-line-item";
import {
  CartDiscounts,
  CartErrorBanner,
  CartNote,
  CartTotals,
  CheckoutButton,
} from "@/components/cart/cart-summary";
import { useSuspenseCart } from "@/lib/cart";

/**
 * Full `/cart` page body.
 *
 * The cart promise is seeded on the server by `AppShell`, so this content
 * suspends locally behind its own fallback while the app shell streams.
 *
 * `fallback` is the server-rendered cart from the `/cart` page. Because it is
 * the Suspense fallback, the real cart — or the empty state — is in the initial
 * HTML and works with JavaScript disabled; hydration then swaps in this
 * optimistic client view.
 */
export function CartView({ fallback }: { fallback?: ReactNode }) {
  return (
    <Suspense fallback={fallback ?? <CartSkeleton />}>
      <CartViewBody />
    </Suspense>
  );
}

function CartViewBody() {
  const cart = useSuspenseCart((state) => state.data);
  const lines = cart.lines?.nodes ?? [];

  if (lines.length === 0) {
    return (
      <>
        <CartViewedTracker cart={null} />
        <EmptyCart />
      </>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <CartViewedTracker
        cart={
          cart.id && cart.updatedAt
            ? { id: cart.id, updatedAt: cart.updatedAt, lines: cart.lines }
            : null
        }
      />
      <h1 className="text-3xl font-semibold tracking-tight">Your cart</h1>

      <div className="mt-8 space-y-4">
        <CartErrorBanner />
      </div>

      <div className="mt-6 grid gap-12 lg:grid-cols-[1fr_22rem]">
        <ul className="divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {lines.map((line) => (
            <CartLineItem key={line.id} line={line} />
          ))}
        </ul>

        <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
            <CartTotals />
            <div className="mt-6">
              <CheckoutButton />
            </div>
          </div>
          <CartDiscounts />
          <CartNote />
        </aside>
      </div>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Your cart is empty</h1>
      <p className="mt-3 text-neutral-600 dark:text-neutral-400">
        Browse the catalog and add something you like.
      </p>
      <Link
        href="/collections"
        className="mt-8 inline-flex items-center justify-center rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        Start shopping
      </Link>
    </div>
  );
}

/** Skeletons while the cart loads — never the empty state. */
function CartSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8" role="status">
      <span className="sr-only">Loading cart…</span>
      <div className="h-9 w-48 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="flex gap-4">
              <div className="h-35 w-28 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
              <div className="flex-1 space-y-3 py-2">
                <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-9 w-40 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-56 animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
      </div>
    </div>
  );
}
