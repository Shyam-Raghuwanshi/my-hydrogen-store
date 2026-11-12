import "server-only";

import { gql, type StorefrontApi } from "@shopify/hydrogen";

/**
 * Shared Storefront API fragments.
 *
 * `gql()` calls live in server-only modules: bundlers cannot tell whether a
 * `gql()` call has side effects, so any document reachable from browser code
 * would be bundled into the browser.
 */

/** The fields every product card needs, on a grid or in a carousel. */
export const PRODUCT_CARD_FRAGMENT = gql(`
  fragment ProductCard on Product {
    id
    title
    handle
    vendor
    featuredImage {
      url
      altText
      width
      height
    }
    priceRange {
      minVariantPrice { amount currencyCode }
      maxVariantPrice { amount currencyCode }
    }
    compareAtPriceRange {
      minVariantPrice { amount currencyCode }
    }
  }
`);

/** The fields every collection card needs. */
export const COLLECTION_CARD_FRAGMENT = gql(`
  fragment CollectionCard on Collection {
    id
    title
    handle
    description
    image { url altText width height }
  }
`);

/*
 * `gql()` returns a branded string, not a gql.tada document, so `FragmentOf`
 * does not apply. To get a standalone fragment's result type, compose it into a
 * throwaway shape query and read `ResultOf` off that.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used as a type only
const PRODUCT_CARD_SHAPE = gql(
  `query ProductCardShape { products(first: 1) { nodes { ...ProductCard } } }`,
  [PRODUCT_CARD_FRAGMENT],
);
export type ProductCardData = NonNullable<
  StorefrontApi.ResultOf<typeof PRODUCT_CARD_SHAPE>["products"]["nodes"][number]
>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used as a type only
const COLLECTION_CARD_SHAPE = gql(
  `query CollectionCardShape { collections(first: 1) { nodes { ...CollectionCard } } }`,
  [COLLECTION_CARD_FRAGMENT],
);
export type CollectionCardData = NonNullable<
  StorefrontApi.ResultOf<
    typeof COLLECTION_CARD_SHAPE
  >["collections"]["nodes"][number]
>;
