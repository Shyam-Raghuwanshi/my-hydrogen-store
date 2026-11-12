import type { Metadata } from "next";
import { Suspense } from "react";

import { SearchViewedTracker } from "@/components/analytics/view-trackers";
import { CollectionBrowser } from "@/components/collection-browser";
import { getSearchBrowse } from "@/lib/queries/browse";
import { toURLSearchParams } from "@/lib/search-params";

export const metadata: Metadata = {
  title: "Search",
  description: "Search the full catalog.",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function SearchPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <SearchContent searchParams={searchParams} />
    </Suspense>
  );
}

async function SearchContent({ searchParams }: PageProps) {
  const urlSearch = toURLSearchParams(await searchParams);
  const term = urlSearch.get("q") ?? "";
  const data = await getSearchBrowse(term, urlSearch.toString());

  return (
    <>
      <SearchViewedTracker searchTerm={term} />
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {term ? `Results for “${term}”` : "Search"}
          </h1>

          {/* Its own form, separate from the filter/sort form. */}
          <form method="get" action="/search" className="mt-6 flex max-w-lg gap-2">
            <input
              // Uncontrolled so the no-JS GET submit works; `key` resets it on
              // navigation (e.g. "Clear search"). Safe because `term` changes
              // only on submit/navigation, never while typing.
              key={term}
              type="search"
              name="q"
              defaultValue={term}
              placeholder="Search products…"
              aria-label="Search products"
              className="flex-1 rounded-full border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-100"
            />
            <button
              type="submit"
              className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white dark:bg-neutral-50 dark:text-neutral-900"
            >
              Search
            </button>
          </form>
        </div>
      </header>

      {term ? (
        <CollectionBrowser
          mode="search"
          term={term}
          products={data.products}
          availableFilters={data.availableFilters}
          currencyCode={data.currencyCode}
          totalCount={data.totalCount}
          pageInfo={data.pageInfo}
          dataSearch={urlSearch.toString()}
        />
      ) : (
        <p className="mx-auto max-w-7xl px-4 py-20 text-center text-sm text-neutral-500 sm:px-6 lg:px-8">
          Enter a search term to browse the catalog.
        </p>
      )}
    </>
  );
}

function SearchSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="h-10 w-48 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
      <div className="mt-6 h-11 w-full max-w-lg animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
    </div>
  );
}
