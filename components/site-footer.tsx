import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 dark:text-neutral-500">
        <p>
          Built with{" "}
          <a
            href="https://shopify.dev/docs/storefronts/headless/hydrogen"
            className="underline hover:text-neutral-900 dark:hover:text-neutral-100"
            target="_blank"
            rel="noreferrer"
          >
            Shopify Hydrogen
          </a>{" "}
          and Next.js.
        </p>
        <nav className="flex flex-wrap gap-5">
          <Link href="/collections" className="hover:text-neutral-900 dark:hover:text-neutral-100">
            Collections
          </Link>
          <Link href="/search" className="hover:text-neutral-900 dark:hover:text-neutral-100">
            Search
          </Link>
          <Link href="/cart" className="hover:text-neutral-900 dark:hover:text-neutral-100">
            Cart
          </Link>
          <Link href="/account" className="hover:text-neutral-900 dark:hover:text-neutral-100">
            Account
          </Link>
        </nav>
      </div>
    </footer>
  );
}
