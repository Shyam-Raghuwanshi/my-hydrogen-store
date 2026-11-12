import Link from "next/link";

import { ShopifyImage } from "@/components/shopify-image";
import type { ProductCardData } from "@/lib/graphql/fragments";
import { formatPrice, formatPriceRange } from "@/lib/money";

/**
 * Product grid tile. Links to `/products/{handle}` — the app's actual product
 * route, which is also Shopify's standard path, so `routeTemplates` stays empty.
 */
export function ProductCard({
  product,
  priority = false,
  sizes = "(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw",
}: {
  product: ProductCardData;
  priority?: boolean;
  sizes?: string;
}) {
  const { minVariantPrice, maxVariantPrice } = product.priceRange;
  const compareAt = product.compareAtPriceRange?.minVariantPrice;
  const onSale =
    compareAt && Number(compareAt.amount) > Number(minVariantPrice.amount);

  return (
    <Link
      href={`/products/${product.handle}`}
      className="group focus-visible:ring-neutral-900 dark:focus-visible:ring-neutral-100 block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-4"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-900">
        <ShopifyImage
          image={product.featuredImage}
          width={500}
          height={625}
          crop="center"
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        {onSale ? (
          <span className="absolute top-3 left-3 rounded-full bg-neutral-900 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white uppercase">
            Sale
          </span>
        ) : null}
      </div>

      <div className="mt-3 space-y-1">
        {product.vendor ? (
          <p className="text-xs tracking-wide text-neutral-500 uppercase dark:text-neutral-500">
            {product.vendor}
          </p>
        ) : null}
        <h3 className="text-sm font-medium text-neutral-900 group-hover:underline dark:text-neutral-100">
          {product.title}
        </h3>
        <p className="flex items-baseline gap-2 text-sm">
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
            {formatPriceRange(minVariantPrice, maxVariantPrice)}
          </span>
          {onSale ? (
            <span className="text-neutral-400 line-through dark:text-neutral-600">
              {formatPrice(compareAt)}
            </span>
          ) : null}
        </p>
      </div>
    </Link>
  );
}
