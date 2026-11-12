"use client";

import type { CurrencyCode } from "@shopify/hydrogen/storefront-api-types";
import { useCartAnalytics } from "@shopify/hydrogen/react";
import { useEffect } from "react";

import { AnalyticsEvent, getAnalytics } from "@/lib/analytics";

/**
 * Per-route view events. Each is a thin client component that takes
 * server-resolved data and publishes once on mount.
 *
 * The bus is consent-aware on its own: destinations receive nothing until the
 * Customer Privacy API reports that analytics processing is allowed. These
 * components decide *when* to publish, never whether consent applies.
 */

type Money = { amount: string; currencyCode: CurrencyCode };

export function ProductViewedTracker({
  product,
}: {
  product: {
    id: string;
    handle: string;
    title: string;
    vendor: string;
    selectedOrFirstAvailableVariant: {
      id: string;
      title: string;
      price: Money;
      sku?: string | null;
    } | null;
    priceRange: { minVariantPrice: Money };
  };
}) {
  useEffect(() => {
    const variant = product.selectedOrFirstAvailableVariant;
    // Monorail requires id, title, price, vendor, variantId and variantTitle,
    // and the IDs must be GIDs — handles are routing data, not analytics IDs.
    getAnalytics()?.publish(AnalyticsEvent.PRODUCT_VIEWED, {
      products: [
        {
          id: product.id,
          title: product.title,
          price: variant?.price ?? product.priceRange.minVariantPrice,
          vendor: product.vendor,
          variantId: variant?.id ?? product.id,
          variantTitle: variant?.title ?? product.title,
          quantity: 1,
          sku: variant?.sku ?? undefined,
        },
      ],
    });
  }, [product]);

  return null;
}

export function CollectionViewedTracker({
  collection,
}: {
  collection: { id: string; handle: string; title: string };
}) {
  useEffect(() => {
    getAnalytics()?.publish(AnalyticsEvent.COLLECTION_VIEWED, { collection });
  }, [collection]);

  return null;
}

export function SearchViewedTracker({ searchTerm }: { searchTerm: string }) {
  useEffect(() => {
    if (!searchTerm) return;
    getAnalytics()?.publish(AnalyticsEvent.SEARCH_VIEWED, { searchTerm });
  }, [searchTerm]);

  return null;
}

/**
 * Subscribes the cart store to analytics for the page lifetime, emitting
 * `cart_updated`, `product_added_to_cart` and `product_removed_from_cart` on
 * confirmed changes.
 *
 * Rendered inside `CartProvider` — the React binding's equivalent of calling
 * `trackCartAnalytics(cartStore)`, which must never happen at store-creation
 * time because that runs during SSR where the bus does not exist.
 *
 * ONLY MOUNT THIS WHEN `ShopifyScripts` IS RENDERED (i.e. `SHOP_ID` is set).
 * Unlike the view trackers above, which publish through a null-safe
 * `getAnalytics()?.publish(...)`, `trackCartAnalytics()` *throws*
 * ("Shopify analytics bus is not available") when `window.Shopify.analytics`
 * is missing. `useCartAnalytics()` is a hook, so it cannot be guarded from in
 * here — the caller must not render the component. See `app/layout.tsx`.
 */
export function CartAnalytics() {
  useCartAnalytics();
  return null;
}

/**
 * `cart_viewed`, for both the `/cart` page and the drawer opening.
 *
 * `cart` is `AnalyticsCart | null`: when no compatible cart is available it
 * passes `null` rather than a partial object.
 */
export function CartViewedTracker({
  cart,
}: {
  cart: {
    id: string;
    updatedAt: string;
    lines: { nodes: unknown[] };
  } | null;
}) {
  const key = cart ? `${cart.id}:${cart.updatedAt}` : null;

  useEffect(() => {
    getAnalytics()?.publish(AnalyticsEvent.CART_VIEWED, {
      cart: cart as never,
    });
    // Republishes when the viewed cart actually changes, not on every render.
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
