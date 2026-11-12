import Link from "next/link";

import { CartTrigger } from "@/components/cart/cart-trigger";

/**
 * Shared site navigation.
 *
 * Server-rendered. Every destination here is a real route in this app —
 * notably there is no `/collections/all` link: "all" is a Liquid storefront
 * convention with no Storefront API equivalent, so that route would 404.
 * "Shop everything" points at the `/collections` listing instead.
 */
export function SiteHeader({ cartCount = true }: { cartCount?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/85 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:gap-8 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight whitespace-nowrap"
        >
          Hydrogen Store
        </Link>

        <nav
          aria-label="Main"
          className="hidden items-center gap-6 text-sm text-neutral-600 sm:flex dark:text-neutral-400"
        >
          <Link
            href="/collections"
            className="transition hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            Collections
          </Link>
          <Link
            href="/search"
            className="transition hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            Search
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/account"
            className="rounded-full px-3 py-1.5 text-sm transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Account
          </Link>
          <CartTrigger showCount={cartCount} />
        </div>
      </div>

      {/* Mobile nav row */}
      <nav
        aria-label="Main (compact)"
        className="flex items-center gap-5 border-t border-neutral-200 px-4 py-2 text-sm text-neutral-600 sm:hidden dark:border-neutral-800 dark:text-neutral-400"
      >
        <Link href="/collections">Collections</Link>
        <Link href="/search">Search</Link>
      </nav>
    </header>
  );
}
