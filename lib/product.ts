"use client";

import { createProductComponents } from "@shopify/hydrogen/react";

import type { ProductData } from "@/lib/queries/product";

/**
 * Typed product bindings, created once.
 *
 * `useProduct` is read-only selection state (price, gallery, analytics);
 * `useProductForm` adds the form bindings (`register`, `formProps`, `pending`).
 *
 * Only the *type* comes from the server-only query module, so nothing server
 * side is pulled into the browser bundle.
 */
export const { ProductProvider, useProduct, useProductForm } =
  createProductComponents<ProductData>();
