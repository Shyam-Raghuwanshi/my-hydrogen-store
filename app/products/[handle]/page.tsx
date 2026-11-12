import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProductViewedTracker } from "@/components/analytics/view-trackers";
import { ProductCard } from "@/components/product-card";
import { ProductDetails } from "@/components/product/product-details";
import { Section } from "@/components/section";
import { getProduct, getRelatedProducts } from "@/lib/queries/product-read";
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
  const product = await getProduct(handle, "");
  if (!product) return { title: "Product not found" };

  const image = product.media.nodes.find(
    (node) => node.__typename === "MediaImage" && node.image?.url,
  );

  return {
    title: product.seo.title ?? product.title,
    description: product.seo.description ?? product.description ?? undefined,
    openGraph: {
      title: product.seo.title ?? product.title,
      description: product.seo.description ?? product.description ?? undefined,
      images:
        image?.__typename === "MediaImage" && image.image?.url
          ? [{ url: image.image.url }]
          : undefined,
    },
  };
}

export default async function ProductPage({ params, searchParams }: PageProps) {
  const { handle } = await params;

  // Existence is resolved above the Suspense boundary so `notFound()` runs as
  // early as possible (see the `instant` note above for the status caveat).
  const baseProduct = await getProduct(handle, "");
  if (!baseProduct) notFound();

  return (
    <>
      <Suspense key={handle} fallback={<ProductSkeleton />}>
        <ProductContent handle={handle} searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={null}>
        <RelatedProducts handle={handle} />
      </Suspense>
      <ProductJsonLd handle={handle} />
    </>
  );
}

async function ProductContent({
  handle,
  searchParams,
}: {
  handle: string;
  searchParams: PageProps["searchParams"];
}) {
  const urlSearch = toURLSearchParams(await searchParams);
  const product = await getProduct(handle, urlSearch.toString());
  if (!product) notFound();

  return (
    <>
      <ProductViewedTracker product={product} />
      <ProductDetails product={product} searchString={urlSearch.toString()} />
    </>
  );
}

async function RelatedProducts({ handle }: { handle: string }) {
  const products = await getRelatedProducts(handle);
  if (products.length === 0) return null;

  return (
    <Section title="You may also like">
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </Section>
  );
}

/** `Product` structured data, built from Storefront API values. */
async function ProductJsonLd({ handle }: { handle: string }) {
  const product = await getProduct(handle, "");
  if (!product) return null;

  const variant = product.selectedOrFirstAvailableVariant;
  const image = product.media.nodes.find(
    (node) => node.__typename === "MediaImage" && node.image?.url,
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description || undefined,
    sku: variant?.sku || undefined,
    brand: product.vendor ? { "@type": "Brand", name: product.vendor } : undefined,
    image:
      image?.__typename === "MediaImage" && image.image?.url
        ? [image.image.url]
        : undefined,
    offers: variant
      ? {
          "@type": "Offer",
          price: variant.price.amount,
          priceCurrency: variant.price.currencyCode,
          availability: variant.availableForSale
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        }
      : undefined,
  };

  return (
    <script
      type="application/ld+json"
      // Server-built from Storefront API data.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

function ProductSkeleton() {
  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
      <div className="aspect-4/5 animate-pulse rounded-3xl bg-neutral-200 dark:bg-neutral-800" />
      <div className="space-y-5">
        <div className="h-10 w-3/4 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-7 w-28 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-10 w-48 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-12 w-full animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
      </div>
    </div>
  );
}
