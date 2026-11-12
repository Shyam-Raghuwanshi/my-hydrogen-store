import "server-only";

import { gql } from "@shopify/hydrogen";
import { cacheLife, cacheTag } from "next/cache";

import {
  COLLECTION_CARD_FRAGMENT,
  PRODUCT_CARD_FRAGMENT,
} from "@/lib/graphql/fragments";
import { staticStorefrontClient } from "@/lib/storefront-static";

const HOME_QUERY = gql(
  `
  query HomePage(
    $collectionCount: Int!
    $productCount: Int!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    shop {
      name
      description
    }
    collections(first: $collectionCount, sortKey: UPDATED_AT) {
      nodes { ...CollectionCard }
    }
    products(first: $productCount, sortKey: BEST_SELLING) {
      nodes { ...ProductCard }
    }
  }
`,
  [COLLECTION_CARD_FRAGMENT, PRODUCT_CARD_FRAGMENT],
);

/**
 * Catalog read for the home page.
 *
 * Identical for every visitor, so it runs through the module-scope static
 * client inside an explicit `"use cache"` cache-point. Do not add cart data
 * here — the cart belongs to the cart route and the navbar badge.
 */
export async function getHomePageData() {
  "use cache";
  cacheLife("hours");
  cacheTag("storefront", "collections", "products");

  const { data, errors } = await staticStorefrontClient.graphql(HOME_QUERY, {
    variables: { collectionCount: 4, productCount: 8 },
  });

  if (errors) {
    // Partial GraphQL errors do not throw — a 200 with `errors` is valid
    // GraphQL. Log and render whatever data did come back.
    console.error("Home page Storefront API errors", errors);
  }

  return {
    shop: data?.shop ?? null,
    collections: data?.collections?.nodes ?? [],
    products: data?.products?.nodes ?? [],
  };
}
