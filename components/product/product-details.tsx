"use client";

import {
  buildProductSelectionSearchParams,
  canAddToCart,
  type SelectedOption,
} from "@shopify/hydrogen";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ProductGallery } from "@/components/product/product-gallery";
import { ShopifyImage } from "@/components/shopify-image";
import { openCartDrawer } from "@/lib/cart-drawer";
import { formatPrice } from "@/lib/money";
import { ProductProvider, useProduct, useProductForm } from "@/lib/product";
import type { ProductData } from "@/lib/queries/product";

/**
 * `searchString` is passed down from the server page rather than read with
 * `useSearchParams()`. Calling that hook here would make Next render this
 * subtree's Suspense fallback on the server and the real panel only in the
 * browser — which breaks SSR of the product page and any no-JS fallback.
 * Event handlers read the live `window.location.search` instead, so option
 * links still build from the current URL.
 */
export function ProductDetails({
  product,
  searchString,
}: {
  product: ProductData;
  searchString: string;
}) {
  const router = useRouter();

  return (
    <ProductProvider
      product={product}
      // The provider's `onSelect` is the *only* client navigation. Option
      // controls never navigate on their own.
      onSelect={(result) => {
        router.replace(
          variantUrl(
            product,
            result.selectedOptions,
            result.selectedVariant?.product?.handle,
            liveSearch(searchString),
          ),
          { scroll: false },
        );
      }}
    >
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <ProductGallery product={product} />
        <PurchasePanel product={product} searchString={searchString} />
      </div>
    </ProductProvider>
  );
}

/* -------------------------------------------------------------------------- */
/* URL helper                                                                 */
/* -------------------------------------------------------------------------- */

/** The current query string: live in the browser, server-provided during SSR. */
function liveSearch(searchString: string) {
  return typeof window === "undefined" ? searchString : window.location.search;
}

function variantUrl(
  product: { handle: string; options: ReadonlyArray<{ name: string }> },
  selectedOptions: SelectedOption[],
  handle: string | undefined = product.handle,
  base: string | URLSearchParams = new URLSearchParams(),
) {
  const params = buildProductSelectionSearchParams({
    selectedOptions,
    optionNames: product.options.map((option) => option.name),
    base: new URLSearchParams(base),
  });
  const query = params.toString();
  return `/products/${handle}${query ? `?${query}` : ""}`;
}

/*
 * Next keys the `[handle]` segment by value, so a cross-product (combined
 * listing) navigation unmounts this component along with the focused link, and
 * `scroll={false}` also disables the router's own focus handling. Recording the
 * activated value in *module* state lets the new page restore focus — a ref or
 * `useState` inside the component would not survive the remount.
 */
let pendingFocus: { handle: string; optionName: string; value: string } | null = null;

function focusIfPending(
  node: HTMLAnchorElement | null,
  handle: string,
  optionName: string,
  value: string,
) {
  if (
    !node ||
    pendingFocus?.handle !== handle ||
    pendingFocus.optionName !== optionName ||
    pendingFocus.value !== value
  ) {
    return;
  }
  pendingFocus = null;
  node.focus();
}

/* -------------------------------------------------------------------------- */
/* Purchase panel                                                             */
/* -------------------------------------------------------------------------- */

function PurchasePanel({
  product,
  searchString,
}: {
  product: ProductData;
  searchString: string;
}) {
  return (
    <div className="lg:sticky lg:top-24 lg:self-start">
      {product.vendor ? (
        <p className="text-xs tracking-widest text-neutral-500 uppercase">
          {product.vendor}
        </p>
      ) : null}
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        {product.title}
      </h1>

      <ProductPrice product={product} />
      <VariantSelector product={product} searchString={searchString} />
      <AddToCart product={product} />

      {product.descriptionHtml ? (
        <div
          className="prose-sm mt-10 space-y-3 border-t border-neutral-200 pt-8 text-sm leading-relaxed text-neutral-700 dark:border-neutral-800 dark:text-neutral-300 [&_a]:underline [&_li]:ml-4 [&_li]:list-disc"
          // Shopify-authored product copy.
          dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
        />
      ) : product.description ? (
        <p className="mt-10 border-t border-neutral-200 pt-8 text-sm leading-relaxed text-neutral-700 dark:border-neutral-800 dark:text-neutral-300">
          {product.description}
        </p>
      ) : null}
    </div>
  );
}

function ProductPrice({ product }: { product: ProductData }) {
  const { selectedVariant } = useProduct();
  const price = selectedVariant?.price ?? product.priceRange.minVariantPrice;
  const compareAt = selectedVariant?.compareAtPrice;
  const onSale = compareAt && Number(compareAt.amount) > Number(price.amount);

  return (
    <div className="mt-4 flex items-baseline gap-3">
      <p className="text-2xl font-semibold">{formatPrice(price)}</p>
      {onSale ? (
        <>
          <p className="text-lg text-neutral-400 line-through">
            {formatPrice(compareAt)}
          </p>
          <span className="rounded-full bg-neutral-900 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white uppercase dark:bg-neutral-50 dark:text-neutral-900">
            Sale
          </span>
        </>
      ) : null}
    </div>
  );
}

function VariantSelector({
  product,
  searchString,
}: {
  product: ProductData;
  searchString: string;
}) {
  const { options, register } = useProductForm();

  if (options.length === 0) return null;

  return (
    <div className="mt-8 space-y-6">
      {options.map((option) => {
        const definition = product.options.find((entry) => entry.name === option.name);

        return (
          <fieldset key={option.name}>
            <legend className="text-sm font-medium">
              {option.name}
              {(() => {
                const selected = option.values.find((value) => value.selected);
                return selected ? (
                  <span className="ml-2 font-normal text-neutral-500">
                    {selected.name}
                  </span>
                ) : null;
              })()}
            </legend>

            <div className="mt-3 flex flex-wrap gap-2">
              {option.values.map((value) => {
                const swatch = definition?.optionValues.find(
                  (entry) => entry.name === value.name,
                )?.swatch;
                // `swatch.image` is a Media union; only MediaImage carries one.
                const swatchImage =
                  swatch?.image?.__typename === "MediaImage"
                    ? swatch.image.image
                    : null;
                const isCrossProduct = value.handle !== product.handle;

                // Non-existent combinations are disabled buttons, never links.
                if (!value.exists) {
                  return (
                    <button
                      key={value.name}
                      type="button"
                      disabled
                      aria-disabled="true"
                      className="cursor-not-allowed rounded-full border border-dashed border-neutral-300 px-4 py-2 text-sm text-neutral-400 line-through dark:border-neutral-700 dark:text-neutral-600"
                    >
                      {value.name}
                      <span className="sr-only"> (Unavailable combination)</span>
                    </button>
                  );
                }

                const href = variantUrl(
                  product,
                  value.selectedOptions,
                  value.handle,
                  // Render-time hrefs use the server string so SSR and the
                  // first client render agree.
                  searchString,
                );

                return (
                  <Link
                    // A real GET link, so variant selection degrades without
                    // JavaScript.
                    key={value.name}
                    href={href}
                    scroll={false}
                    ref={(node) =>
                      focusIfPending(node, product.handle, option.name, value.name)
                    }
                    aria-current={value.selected ? "true" : undefined}
                    data-available={value.available ? "true" : "false"}
                    onNavigate={(event) => {
                      if (isCrossProduct) {
                        // Let the navigation happen; just record focus for the
                        // page that is about to mount.
                        pendingFocus = {
                          handle: value.handle,
                          optionName: option.name,
                          value: value.name,
                        };
                        return;
                      }
                      // Same-product: cancel Link's navigation so the
                      // provider's `onSelect` is the only one.
                      event.preventDefault();
                      register("optionValue", {
                        optionName: option.name,
                        value: value.name,
                      }).onClick();
                    }}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                      value.selected
                        ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-50 dark:bg-neutral-50 dark:text-neutral-900"
                        : "border-neutral-300 hover:border-neutral-900 dark:border-neutral-700 dark:hover:border-neutral-100"
                    } ${
                      // Sold-out-but-existing values stay interactive; only the
                      // visual treatment changes.
                      value.available ? "" : "opacity-50"
                    }`}
                  >
                    {swatch?.color ? (
                      <span
                        className="h-4 w-4 rounded-full border border-black/10"
                        style={{ backgroundColor: swatch.color }}
                        aria-hidden="true"
                      />
                    ) : swatchImage?.url ? (
                      <ShopifyImage
                        image={swatchImage}
                        width={16}
                        height={16}
                        crop="center"
                        alt=""
                        className="h-4 w-4 rounded-full object-cover"
                      />
                    ) : null}
                    {value.name}
                    {!value.available ? (
                      <span className="sr-only"> (Sold out)</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

function AddToCart({ product }: { product: ProductData }) {
  const { options, selectedVariant, register, formProps, pending, errors } =
    useProductForm();
  const [quantity, setQuantity] = useState(1);

  const addable = canAddToCart(product, options);
  const label = addable
    ? "Add to cart"
    : selectedVariant
      ? "Sold out"
      : "Select options";

  return (
    <div className="mt-8">
      {/*
        Option controls are deliberately *outside* this form: it submits only
        `merchandiseId` and `quantity`.
      */}
      <form
        {...formProps({ beforeSubmit: openCartDrawer })}
        className="flex flex-wrap items-center gap-3"
      >
        <input type="hidden" {...register("merchandiseId", {})} />

        <div className="flex items-center rounded-full border border-neutral-300 dark:border-neutral-700">
          <button
            type="button"
            onClick={() => setQuantity((current) => Math.max(1, current - 1))}
            aria-label="Decrease quantity"
            disabled={quantity <= 1}
            className="px-3.5 py-2.5 text-sm leading-none disabled:opacity-40"
          >
            &minus;
          </button>
          <label htmlFor="pdp-quantity" className="sr-only">
            Quantity
          </label>
          <input
            id="pdp-quantity"
            {...register("quantity", { value: quantity })}
            type="number"
            min={1}
            step={1}
            onChange={(event) =>
              setQuantity(Math.max(1, Number(event.target.value) || 1))
            }
            className="w-12 border-x border-neutral-300 bg-transparent py-2.5 text-center text-sm outline-none dark:border-neutral-700 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={() => setQuantity((current) => current + 1)}
            aria-label="Increase quantity"
            className="px-3.5 py-2.5 text-sm leading-none"
          >
            +
          </button>
        </div>

        <button
          {...register("addToCart", {})}
          disabled={!addable || pending}
          aria-busy={pending}
          className="flex-1 rounded-full bg-neutral-900 px-8 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {pending ? "Adding…" : label}
        </button>
      </form>

      {selectedVariant?.sku ? (
        <p className="mt-3 text-xs text-neutral-500">SKU: {selectedVariant.sku}</p>
      ) : null}

      {errors.userErrors.length > 0 || errors.networkErrors.length > 0 ? (
        <ul role="alert" className="mt-3 space-y-1 text-sm text-red-600">
          {errors.userErrors.map((error, index) => (
            <li key={`user-${index}`}>{error.message}</li>
          ))}
          {errors.networkErrors.map((error, index) => (
            <li key={`network-${index}`}>{error.message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
