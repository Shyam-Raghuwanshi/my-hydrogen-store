import type { Metadata } from "next";
import { Suspense } from "react";

import { CollectionCard } from "@/components/collection-card";
import { EmptyState, Section } from "@/components/section";
import { getCollectionList } from "@/lib/queries/browse";

export const metadata: Metadata = {
  title: "Collections",
  description: "Browse every collection in the store.",
};

export default function CollectionsPage() {
  return (
    <Suspense fallback={<GridSkeleton />}>
      <CollectionGrid />
    </Suspense>
  );
}

async function CollectionGrid() {
  const collections = await getCollectionList();

  return (
    <Section
      title="All collections"
      description="Every published collection in the store."
    >
      {collections.length === 0 ? (
        <EmptyState>No collections are published yet.</EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {collections.map((collection, index) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              priority={index < 4}
            />
          ))}
        </div>
      )}
    </Section>
  );
}

function GridSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
      <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="aspect-[3/4] animate-pulse rounded-2xl bg-neutral-200 sm:aspect-[4/5] dark:bg-neutral-800"
          />
        ))}
      </div>
    </div>
  );
}
