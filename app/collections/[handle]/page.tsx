import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CollectionViewedTracker } from "@/components/analytics/view-trackers";
import { CollectionBrowser } from "@/components/collection-browser";
import { getCollectionBrowse } from "@/lib/queries/browse";
import { toURLSearchParams } from "@/lib/search-params";

/**
 * Opts this route out of instant-navigation validation, because it resolves the
 * resource above its Suspense boundary (see below).
 *
 * Note what this does *not* do: under Cache Components the prerendered shell is
 * sent first, which fixes the response status at 200, so a missing handle still
 * answers 200 in a production build even with `instant = false` — `next dev`
 * returns a real 404 because there is no prerendered shell. Next streams the
 * 404 UI with `<meta name="robots" content="noindex">`, so crawlers stay out.
 * A true 404 status would require checking the handle in `proxy.ts`, which
 * would add a Storefront API request to every route — a deliberate trade we do
 * not make here.
 */
export const instant = false;

type PageProps = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const data = await getCollectionBrowse(handle, "");
  if (!data) return { title: "Collection not found" };

  return {
    title: data.collection.seo.title ?? data.collection.title,
    description: data.collection.seo.description ?? data.collection.description ?? undefined,
  };
}

export default async function CollectionPage({ params, searchParams }: PageProps) {
  const { handle } = await params;

  // Resolve existence above the Suspense boundary so `notFound()` runs as
  // early as possible — a real 404 status in dev, and the earliest possible
  // 404 UI in production. This is the same cached read `generateMetadata`
  // makes, so it costs no extra Storefront API request.
  if (!(await getCollectionBrowse(handle, ""))) notFound();

  return (
    <Suspense key={handle} fallback={<BrowseSkeleton />}>
      <CollectionContent handle={handle} searchParams={searchParams} />
    </Suspense>
  );
}

async function CollectionContent({
  handle,
  searchParams,
}: {
  handle: string;
  searchParams: PageProps["searchParams"];
}) {
  const urlSearch = toURLSearchParams(await searchParams);
  // A plain string crosses the `"use cache"` boundary; URLSearchParams would
  // lose its methods there.
  const data = await getCollectionBrowse(handle, urlSearch.toString());
  if (!data) notFound();

  return (
    <>
      <CollectionViewedTracker
        collection={{
          id: data.collection.id,
          handle: data.collection.handle,
          title: data.collection.title,
        }}
      />
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {data.collection.title}
          </h1>
          {data.collection.description ? (
            <p className="mt-3 max-w-prose text-neutral-600 dark:text-neutral-400">
              {data.collection.description}
            </p>
          ) : null}
        </div>
      </header>

      <CollectionBrowser
        mode="collection"
        handle={handle}
        products={data.products}
        availableFilters={data.availableFilters}
        currencyCode={data.currencyCode}
        totalCount={data.totalCount}
        pageInfo={data.pageInfo}
        // Exactly the search string the server query used.
        dataSearch={urlSearch.toString()}
      />
    </>
  );
}

function BrowseSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="h-10 w-64 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="space-y-3">
            <div className="aspect-[4/5] animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          </div>
        ))}
      </div>
    </div>
  );
}
