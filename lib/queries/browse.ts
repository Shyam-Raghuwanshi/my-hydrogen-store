import "server-only";

import { gql, parseCollectionParams, type AvailableFilter } from "@shopify/hydrogen";
import type { ProductFilter as StorefrontApiProductFilter } from "@shopify/hydrogen/storefront-api-types";
import { cacheLife, cacheTag } from "next/cache";

import {
  COLLECTION_CARD_FRAGMENT,
  PRODUCT_CARD_FRAGMENT,
  type CollectionCardData,
  type ProductCardData,
} from "@/lib/graphql/fragments";
import { staticStorefrontClient } from "@/lib/storefront-static";

export const PAGE_SIZE = 24;

/** What the client browse UI needs, whichever route produced it. */
export type BrowseResult = {
  products: ProductCardData[];
  availableFilters: AvailableFilter[];
  currencyCode: string;
  totalCount: number | null;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
};

/* -------------------------------------------------------------------------- */
/* Collection list                                                            */
/* -------------------------------------------------------------------------- */

const COLLECTIONS_QUERY = gql(
  `
  query CollectionList($first: Int!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    collections(first: $first, sortKey: UPDATED_AT) {
      nodes { ...CollectionCard }
    }
  }
`,
  [COLLECTION_CARD_FRAGMENT],
);

export async function getCollectionList(): Promise<CollectionCardData[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("storefront", "collections");

  const { data, errors } = await staticStorefrontClient.graphql(COLLECTIONS_QUERY, {
    variables: { first: 50 },
  });
  if (errors) console.error("Collection list Storefront API errors", errors);

  return data?.collections?.nodes ?? [];
}

/* -------------------------------------------------------------------------- */
/* Collection detail                                                          */
/* -------------------------------------------------------------------------- */

const COLLECTION_QUERY = gql(
  `
  query CollectionBrowse(
    $handle: String!
    $first: Int
    $last: Int
    $after: String
    $before: String
    $filters: [ProductFilter!]
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    shop { paymentSettings { currencyCode } }
    collection(handle: $handle) {
      ...CollectionCard
      seo { title description }
      products(
        first: $first
        last: $last
        after: $after
        before: $before
        filters: $filters
        sortKey: $sortKey
        reverse: $reverse
      ) {
        filters { id label type values { id label count input } }
        nodes { ...ProductCard }
        pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
      }
    }
  }
`,
  [COLLECTION_CARD_FRAGMENT, PRODUCT_CARD_FRAGMENT],
);

export type CollectionBrowseData = BrowseResult & {
  collection: CollectionCardData & {
    seo: { title: string | null; description: string | null };
  };
};

/**
 * Loads one collection page for the given browse state.
 *
 * `searchString` is a plain string, not `URLSearchParams`: `"use cache"`
 * serializes its arguments and a `URLSearchParams` would lose its methods
 * across that boundary, so it is reconstructed inside the cache-point.
 */
export async function getCollectionBrowse(
  handle: string,
  searchString: string,
): Promise<CollectionBrowseData | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("storefront", "products", `collection:${handle}`);

  const params = new URLSearchParams(searchString);
  const browse = parseCollectionParams(params);
  const after = params.get("after");
  const before = params.get("before");

  const { data, errors } = await staticStorefrontClient.graphql(COLLECTION_QUERY, {
    variables: {
      handle,
      // Cursor pagination: `before` pages backwards with `last`.
      first: before ? undefined : PAGE_SIZE,
      last: before ? PAGE_SIZE : undefined,
      after: after ?? undefined,
      before: before ?? undefined,
      filters:
        browse.filters.length > 0
          ? (browse.filters as StorefrontApiProductFilter[])
          : undefined,
      sortKey: browse.sortKey,
      reverse: browse.reverse || undefined,
    },
  });

  if (errors) console.error("Collection Storefront API errors", errors);
  if (!data?.collection) return null;

  const { products, ...collection } = data.collection;

  return {
    collection,
    products: products.nodes,
    availableFilters: products.filters as AvailableFilter[],
    currencyCode: data.shop.paymentSettings.currencyCode,
    totalCount: null,
    pageInfo: products.pageInfo,
  };
}

/* -------------------------------------------------------------------------- */
/* Search                                                                     */
/* -------------------------------------------------------------------------- */

const SEARCH_QUERY = gql(
  `
  query SearchBrowse(
    $term: String!
    $first: Int
    $last: Int
    $after: String
    $before: String
    $filters: [ProductFilter!]
    $sortKey: SearchSortKeys
    $reverse: Boolean
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    shop { paymentSettings { currencyCode } }
    search(
      query: $term
      types: PRODUCT
      first: $first
      last: $last
      after: $after
      before: $before
      productFilters: $filters
      sortKey: $sortKey
      reverse: $reverse
    ) {
      totalCount
      productFilters { id label type values { id label count input } }
      nodes { ... on Product { ...ProductCard } }
      pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
    }
  }
`,
  [PRODUCT_CARD_FRAGMENT],
);

/** `parseCollectionParams` yields product sort keys; search has its own enum. */
const SEARCH_SORT_KEYS = new Set(["RELEVANCE", "PRICE"]);

export async function getSearchBrowse(
  term: string,
  searchString: string,
): Promise<BrowseResult> {
  "use cache";
  cacheLife("minutes");
  cacheTag("storefront", "products", "search");

  const empty: BrowseResult = {
    products: [],
    availableFilters: [],
    currencyCode: "USD",
    totalCount: 0,
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    },
  };

  // An empty term returns nothing rather than querying the Storefront API.
  if (!term.trim()) return empty;

  const params = new URLSearchParams(searchString);
  const browse = parseCollectionParams(params);
  const after = params.get("after");
  const before = params.get("before");

  // Unsupported search sorts map back to RELEVANCE; only PRICE uses `reverse`.
  const sortKey =
    browse.sortKey && SEARCH_SORT_KEYS.has(browse.sortKey) ? browse.sortKey : "RELEVANCE";

  const { data, errors } = await staticStorefrontClient.graphql(SEARCH_QUERY, {
    variables: {
      term,
      first: before ? undefined : PAGE_SIZE,
      last: before ? PAGE_SIZE : undefined,
      after: after ?? undefined,
      before: before ?? undefined,
      filters:
        browse.filters.length > 0
          ? (browse.filters as StorefrontApiProductFilter[])
          : undefined,
      sortKey: sortKey as "RELEVANCE" | "PRICE",
      reverse: sortKey === "PRICE" ? browse.reverse || undefined : undefined,
    },
  });

  if (errors) console.error("Search Storefront API errors", errors);
  if (!data?.search) return empty;

  return {
    products: data.search.nodes.filter(
      (node): node is ProductCardData => node != null && "handle" in node,
    ),
    availableFilters: data.search.productFilters as AvailableFilter[],
    currencyCode: data.shop.paymentSettings.currencyCode,
    totalCount: data.search.totalCount,
    pageInfo: data.search.pageInfo,
  };
}
