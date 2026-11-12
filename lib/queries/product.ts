import "server-only";

import { gql, type StorefrontApi } from "@shopify/hydrogen";

import { PRODUCT_CARD_FRAGMENT, type ProductCardData } from "@/lib/graphql/fragments";

/**
 * One reusable variant fragment, shared by `firstSelectableVariant`,
 * `selectedOrFirstAvailableVariant`, and `adjacentVariants`, so
 * `selectedVariant` always has the fields the UI needs after option selection.
 */
export const VARIANT_FIELDS_FRAGMENT = gql(`
  fragment VariantFields on ProductVariant {
    id
    title
    availableForSale
    selectedOptions { name value }
    price { amount currencyCode }
    compareAtPrice { amount currencyCode }
    image { url altText width height }
    product { title handle }
    sku
  }
`);

export const PRODUCT_QUERY = gql(
  `
  query Product(
    $handle: String!
    $selectedOptions: [SelectedOptionInput!]!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      handle
      title
      vendor
      description
      descriptionHtml
      requiresSellingPlan
      seo { title description }
      options {
        name
        optionValues {
          name
          firstSelectableVariant { ...VariantFields }
          swatch {
            color
            image {
              __typename
              ... on MediaImage {
                image { url altText }
              }
            }
          }
        }
      }
      # The encoded fields are what let the client store compute per-value
      # existence and availability with no extra network requests.
      encodedVariantExistence
      encodedVariantAvailability
      selectedOrFirstAvailableVariant(
        selectedOptions: $selectedOptions
        ignoreUnknownOptions: true
        caseInsensitiveMatch: true
      ) { ...VariantFields }
      adjacentVariants(
        selectedOptions: $selectedOptions
        ignoreUnknownOptions: true
        caseInsensitiveMatch: true
      ) { ...VariantFields }
      media(first: 8) {
        nodes {
          __typename
          id
          mediaContentType
          alt
          ... on MediaImage {
            image { url altText width height }
          }
          previewImage { url altText width height }
        }
      }
      priceRange {
        minVariantPrice { amount currencyCode }
        maxVariantPrice { amount currencyCode }
      }
    }
  }
`,
  [VARIANT_FIELDS_FRAGMENT],
);

export type ProductData = NonNullable<
  StorefrontApi.ResultOf<typeof PRODUCT_QUERY>["product"]
>;

/** Related products for the "You may also like" rail. */
export const RELATED_PRODUCTS_QUERY = gql(
  `
  query RelatedProducts(
    $handle: String!
    $first: Int!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    productRecommendations(productHandle: $handle) {
      ...ProductCard
    }
    products(first: $first, sortKey: BEST_SELLING) {
      nodes { ...ProductCard }
    }
  }
`,
  [PRODUCT_CARD_FRAGMENT],
);

export type { ProductCardData };
