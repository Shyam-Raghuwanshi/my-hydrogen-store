import "server-only";

import { getSelectedProductOptions } from "@shopify/hydrogen";
import { cacheLife, cacheTag } from "next/cache";

import type { ProductCardData } from "@/lib/graphql/fragments";
import {
  PRODUCT_QUERY,
  RELATED_PRODUCTS_QUERY,
  type ProductData,
} from "@/lib/queries/product";
import { staticStorefrontClient } from "@/lib/storefront-static";

/** Raised when the product query itself failed, as opposed to not existing. */
export class ProductQueryError extends Error {}

/**
 * Loads a product for the given URL-selected options.
 *
 * `searchString` crosses the `"use cache"` boundary as a plain string. Option
 * selection comes from `getSelectedProductOptions`, constrained to the names
 * the product actually defines so `utm_*`/`ref` params are ignored.
 */
export async function getProduct(
  handle: string,
  searchString: string,
): Promise<ProductData | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("storefront", "products", `product:${handle}`);

  const searchParams = new URLSearchParams(searchString);
  const selectedOptions = getSelectedProductOptions({ searchParams });

  const { data, errors } = await staticStorefrontClient.graphql(PRODUCT_QUERY, {
    variables: { handle, selectedOptions },
  });

  // Errors are checked before `data.product`: a failed query is a 500, while a
  // clean query with no product is a 404.
  if (errors) {
    console.error("[hydrogen] Product query failed", errors);
    throw new ProductQueryError(`Product query failed for "${handle}"`);
  }

  return data?.product ?? null;
}

/** Recommendations, falling back to best sellers when none are configured. */
export async function getRelatedProducts(
  handle: string,
): Promise<ProductCardData[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("storefront", "products");

  const { data, errors } = await staticStorefrontClient.graphql(
    RELATED_PRODUCTS_QUERY,
    { variables: { handle, first: 10 } },
  );
  if (errors) console.error("Related products Storefront API errors", errors);

  const recommended = data?.productRecommendations ?? [];
  const pool = recommended.length > 0 ? recommended : (data?.products?.nodes ?? []);

  return pool.filter((product) => product.handle !== handle).slice(0, 4);
}
