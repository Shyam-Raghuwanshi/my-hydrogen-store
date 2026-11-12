"use client";

import Link from "next/link";
import { useId } from "react";

import { ShopifyImage } from "@/components/shopify-image";
import { useCart, useCartForm } from "@/lib/cart";
import { formatPrice } from "@/lib/money";

/**
 * One cart line, as its own form.
 *
 * The Hydrogen contract this must preserve, in the drawer and on the `/cart`
 * page alike: a hidden `set` submit button, a `lineId`, and a real editable
 * quantity input. Increase/decrease/remove are *extra* submit controls, not
 * replacements — without the `set` button and the live input, pressing Enter in
 * the quantity field and the no-JS submit both break.
 */
export function CartLineItem({
  line,
  compact = false,
}: {
  // Cart line merchandise is intentionally tolerant: optimistic lines and
  // custom fragments can differ from a complete Storefront API response.
  line: {
    id: string;
    quantity: number;
    cost?: { totalAmount?: { amount: string; currencyCode: string } | null } | null;
    attributes?: ReadonlyArray<{ key: string; value?: string | null }> | null;
    merchandise?: {
      title?: string | null;
      availableForSale?: boolean | null;
      image?: { url: string; altText?: string | null } | null;
      price?: { amount: string; currencyCode: string } | null;
      product?: { title?: string | null; handle?: string | null } | null;
      selectedOptions?: ReadonlyArray<{ name: string; value: string }> | null;
    } | null;
  };
  compact?: boolean;
}) {
  const { formProps, register } = useCartForm();
  const pendingLines = useCart((state) => state.pending.lines);
  const lineErrors = useCart((state) => state.errors.lines);

  const quantityId = useId();
  const errorId = useId();

  const isPending = pendingLines.has(line.id);
  const errorGroup = lineErrors.get(line.id);
  const errorMessage =
    errorGroup?.userErrors?.[0]?.message ?? errorGroup?.warnings?.[0]?.message;

  const merchandise = line.merchandise;
  const title = merchandise?.product?.title ?? merchandise?.title ?? "Product";
  const handle = merchandise?.product?.handle;
  const options = merchandise?.selectedOptions ?? [];
  // Attribute keys starting with `_` are internal, set by apps or Shopify.
  const visibleAttributes = (line.attributes ?? []).filter(
    (attribute) => !attribute.key.startsWith("_"),
  );
  const lineTotal = line.cost?.totalAmount;

  // Unconfirmed values must look distinct from confirmed ones. Reduced opacity
  // makes the stale text a signal rather than content to read.
  const pendingClass = isPending ? "opacity-40" : "";

  return (
    <li className="flex gap-4 py-5">
      <Link
        href={handle ? `/products/${handle}` : "/collections"}
        className="shrink-0"
        tabIndex={handle ? undefined : -1}
      >
        <ShopifyImage
          image={merchandise?.image}
          width={compact ? 80 : 112}
          height={compact ? 100 : 140}
          crop="center"
          className={`${compact ? "h-25 w-20" : "h-35 w-28"} rounded-xl bg-neutral-100 object-cover dark:bg-neutral-800`}
        />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium">
              {handle ? (
                <Link href={`/products/${handle}`} className="hover:underline">
                  {title}
                </Link>
              ) : (
                title
              )}
            </h3>
            {options.length > 0 ? (
              <p className="mt-0.5 truncate text-xs text-neutral-500">
                {options.map((option) => option.value).join(" · ")}
              </p>
            ) : null}
            {visibleAttributes.map((attribute) => (
              <p key={attribute.key} className="mt-0.5 text-xs text-neutral-500">
                {attribute.key}: {attribute.value}
              </p>
            ))}
            {merchandise?.availableForSale === false ? (
              <p className="mt-1 text-xs font-medium text-amber-600">
                No longer available
              </p>
            ) : null}
          </div>

          {lineTotal ? (
            <p className={`text-sm font-semibold whitespace-nowrap ${pendingClass}`}>
              {formatPrice(lineTotal)}
            </p>
          ) : null}
        </div>

        <form {...formProps()} className="mt-3 flex items-center gap-3">
          {/*
            `register("set")` already returns `{ type: "submit", hidden: true }`.
            It must be a <button>, not a hidden input, or Enter in the quantity
            field stops submitting the set action.
          */}
          <button {...register("set")}>Update</button>
          <input type="hidden" {...register("lineId", { value: line.id })} />

          <div className="flex items-center rounded-full border border-neutral-300 dark:border-neutral-700">
            <button
              type="submit"
              {...register("decrease")}
              aria-label={`Decrease quantity of ${title}`}
              className="px-3 py-1.5 text-sm leading-none disabled:opacity-40"
            >
              &minus;
            </button>
            <label htmlFor={quantityId} className="sr-only">
              Quantity of {title}
            </label>
            <input
              id={quantityId}
              // Controls stay interactive while pending: a new click
              // supersedes the in-flight request.
              {...register("quantity", { value: line.quantity, interactive: true })}
              aria-invalid={errorMessage ? "true" : undefined}
              aria-describedby={errorMessage ? errorId : undefined}
              className={`w-12 border-x border-neutral-300 bg-transparent py-1.5 text-center text-sm outline-none dark:border-neutral-700 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none ${pendingClass}`}
            />
            <button
              type="submit"
              {...register("increase")}
              aria-label={`Increase quantity of ${title}`}
              className="px-3 py-1.5 text-sm leading-none"
            >
              +
            </button>
          </div>

          <button
            type="submit"
            {...register("remove")}
            className="text-xs text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline dark:hover:text-neutral-100"
          >
            Remove
          </button>
        </form>

        {errorMessage ? (
          // Inline, next to the line it describes — not only in a banner.
          <p id={errorId} role="alert" className="mt-2 text-xs text-red-600">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </li>
  );
}
