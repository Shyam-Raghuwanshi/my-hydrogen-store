import Link from "next/link";

import { ShopifyImage } from "@/components/shopify-image";
import type { CollectionCardData } from "@/lib/graphql/fragments";

/** Collection tile linking to `/collections/{handle}`. */
export function CollectionCard({
  collection,
  priority = false,
}: {
  collection: CollectionCardData;
  priority?: boolean;
}) {
  return (
    <Link
      href={`/collections/${collection.handle}`}
      className="group focus-visible:ring-neutral-900 dark:focus-visible:ring-neutral-100 relative block aspect-[3/4] overflow-hidden rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-4 sm:aspect-[4/5]"
    >
      <ShopifyImage
        image={collection.image}
        width={560}
        height={700}
        crop="center"
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
        loading={priority ? "eager" : "lazy"}
        className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"
        aria-hidden="true"
      />
      <div className="absolute inset-x-0 bottom-0 p-5">
        <h3 className="text-lg font-semibold text-white">{collection.title}</h3>
        <p className="mt-1 text-sm text-white/80 group-hover:underline">
          Shop now
        </p>
      </div>
    </Link>
  );
}
