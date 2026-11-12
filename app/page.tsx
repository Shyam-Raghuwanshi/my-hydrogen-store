import Link from "next/link";
import { Suspense } from "react";

import { CollectionCard } from "@/components/collection-card";
import { ProductCard } from "@/components/product-card";
import { EmptyState, Section } from "@/components/section";
import { getHomePageData } from "@/lib/queries/home";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Suspense fallback={<StorefrontSkeleton />}>
        <StorefrontSections />
      </Suspense>
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase dark:text-neutral-400">
            New season
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Everyday essentials, built to last.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-neutral-600 dark:text-neutral-400">
            A headless Shopify storefront powered by Hydrogen&rsquo;s Storefront
            API client and Next.js server components.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/collections"
              className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Shop collections
            </Link>
            <Link
              href="/search"
              className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-6 py-3 text-sm font-medium transition hover:bg-white dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              Browse everything
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

async function StorefrontSections() {
  const { collections, products } = await getHomePageData();

  return (
    <>
      <Section
        title="Shop by collection"
        description="Curated edits from across the catalog."
        href="/collections"
      >
        {collections.length === 0 ? (
          <EmptyState>No collections are published yet.</EmptyState>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {collections.map((collection, index) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                priority={index < 2}
              />
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Best sellers"
        description="What everyone is buying right now."
        href="/search"
        hrefLabel="View all products"
      >
        {products.length === 0 ? (
          <EmptyState>No products are published yet.</EmptyState>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

function StorefrontSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
      <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="aspect-[3/4] animate-pulse rounded-2xl bg-neutral-200 sm:aspect-[4/5] dark:bg-neutral-800"
          />
        ))}
      </div>
    </div>
  );
}
