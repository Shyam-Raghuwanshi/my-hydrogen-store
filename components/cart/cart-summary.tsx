"use client";

import { useId, useState } from "react";

import { useCart, useCartForm } from "@/lib/cart";
import { formatPrice } from "@/lib/money";

/** Totals block. Amounts are always server-provided, never computed here. */
export function CartTotals({ compact = false }: { compact?: boolean }) {
  const cost = useCart((state) => state.data.cost);
  // Totals are unconfirmed while line/discount work is in flight, or while the
  // store runs its authoritative refresh after overlapping mutations.
  const pending = useCart(
    (state) => state.pending.cost === true || state.revalidating === true,
  );

  const pendingClass = pending ? "opacity-40" : "";

  return (
    <dl className="space-y-2 text-sm">
      <Row
        label="Subtotal"
        value={cost?.subtotalAmount ? formatPrice(cost.subtotalAmount) : "—"}
        className={pendingClass}
      />
      {/*
        Duties and taxes are not in Hydrogen's default cart fragment. To show
        them, add `cost { totalDutyAmount { ... } totalTaxAmount { ... } }` to a
        custom `CartFragment` on `createCartServerHandlers`.
      */}
      {!compact ? (
        <p className="pt-1 text-xs text-neutral-500">
          Shipping and taxes calculated at checkout.
        </p>
      ) : null}
      <div className="border-t border-neutral-200 pt-3 dark:border-neutral-800">
        <Row
          label="Total"
          value={cost?.totalAmount ? formatPrice(cost.totalAmount) : "—"}
          strong
          className={pendingClass}
        />
      </div>
    </dl>
  );
}

function Row({
  label,
  value,
  strong = false,
  className = "",
}: {
  label: string;
  value: string;
  strong?: boolean;
  className?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={strong ? "font-medium" : "text-neutral-600 dark:text-neutral-400"}>
        {label}
      </dt>
      <dd className={`${strong ? "text-base font-semibold" : ""} ${className}`}>
        {value}
      </dd>
    </div>
  );
}

/**
 * Checkout handoff. `cart.checkoutUrl` comes from cart data — never from an
 * env-configured domain — and is a plain `<a>` because it leaves the app.
 */
export function CheckoutButton({ className = "" }: { className?: string }) {
  const checkoutUrl = useCart((state) => state.data.checkoutUrl);
  const totalQuantity = useCart((state) => state.data.totalQuantity);

  if (!checkoutUrl || !totalQuantity) return null;

  return (
    <a
      href={checkoutUrl}
      className={`block w-full rounded-full bg-neutral-900 px-6 py-3 text-center text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200 ${className}`}
    >
      Checkout
    </a>
  );
}

/* -------------------------------------------------------------------------- */
/* Discounts                                                                  */
/* -------------------------------------------------------------------------- */

export function CartDiscounts() {
  const codes = useCart((state) => state.data.discountCodes);
  const pendingCodes = useCart((state) => state.pending.discountCodes);
  const codeErrors = useCart((state) => state.errors.discountCodes);
  const applied = codes ?? [];

  return (
    <div className="space-y-3">
      {applied.length > 0 ? (
        <ul className="space-y-2">
          {applied.map((discount) => {
            const code = discount.code;
            const errorGroup = codeErrors.get(code);
            const message = errorGroup?.userErrors?.[0]?.message;

            return (
              <li key={code} className="space-y-1">
                <div
                  className={`flex items-center justify-between gap-3 rounded-lg bg-neutral-100 px-3 py-2 text-sm dark:bg-neutral-800 ${
                    pendingCodes.has(code) ? "opacity-40" : ""
                  }`}
                >
                  <span className="font-medium">{code}</span>
                  <span className="flex items-center gap-2">
                    {discount.applicable === false ? (
                      <span className="text-xs text-neutral-500">Not applicable</span>
                    ) : null}
                    {/* Each remove is its own single-action form. */}
                    <DiscountRemoveForm code={code} />
                  </span>
                </div>
                {message ? (
                  <p role="alert" className="text-xs text-red-600">
                    {message}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      <DiscountApplyForm appliedCodes={applied.map((discount) => discount.code)} />
    </div>
  );
}

function DiscountRemoveForm({ code }: { code: string }) {
  const { formProps, register } = useCartForm();

  return (
    <form {...formProps()} className="contents">
      <input type="hidden" {...register("discountCode", { value: code })} />
      <button
        type="submit"
        {...register("discount-remove")}
        className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
      >
        Remove<span className="sr-only"> discount {code}</span>
      </button>
    </form>
  );
}

function DiscountApplyForm({ appliedCodes }: { appliedCodes: string[] }) {
  const { formProps, register } = useCartForm();
  const cartErrors = useCart((state) => state.errors.cart);
  const inputId = useId();
  const [draft, setDraft] = useState("");

  const trimmed = draft.trim();
  // Empty and duplicate submissions do nothing, but the button stays clickable
  // so the no-JS path still works and the control never feels dead.
  const isNoOp = trimmed === "" || appliedCodes.includes(trimmed);

  return (
    <form
      {...formProps()}
      onSubmit={(event) => {
        if (isNoOp) {
          event.preventDefault();
          return;
        }
        formProps().onSubmit?.(event);
        setDraft("");
      }}
      className="flex gap-2"
    >
      <label htmlFor={inputId} className="sr-only">
        Discount code
      </label>
      <input
        id={inputId}
        {...register("discountCode", { defaultValue: "" })}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Discount code"
        className="min-w-0 flex-1 rounded-full border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-100"
      />
      <button
        type="submit"
        {...register("discount-apply")}
        className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        Apply
      </button>
      {cartErrors?.userErrors?.[0]?.message ? (
        <p role="alert" className="sr-only">
          {cartErrors.userErrors[0].message}
        </p>
      ) : null}
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Order note                                                                 */
/* -------------------------------------------------------------------------- */

export function CartNote() {
  const storedNote = useCart((state) => state.data.note);
  const pending = useCart((state) => state.pending.note);
  const noteErrors = useCart((state) => state.errors.note);
  const { formProps, register } = useCartForm();
  const noteId = useId();

  const [draft, setDraft] = useState(storedNote ?? "");
  const [syncedNote, setSyncedNote] = useState(storedNote);

  // Sync server responses into the draft only when no save is in flight, so a
  // confirming response cannot clobber typing done during the request. This is
  // React's "adjust state while rendering" pattern rather than an effect, so it
  // never causes a cascading render.
  if (!pending && storedNote !== syncedNote) {
    setSyncedNote(storedNote);
    setDraft(storedNote ?? "");
  }

  const message = noteErrors?.userErrors?.[0]?.message;

  return (
    <form {...formProps()} className="space-y-2">
      <label htmlFor={noteId} className="block text-sm font-medium">
        Order note
      </label>
      <textarea
        id={noteId}
        {...register("note", { value: draft })}
        onChange={(event) => setDraft(event.target.value)}
        rows={3}
        aria-invalid={message ? "true" : undefined}
        placeholder="Add delivery instructions or a gift message"
        className={`w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-100 ${
          pending ? "opacity-60" : ""
        }`}
      />
      <button
        type="submit"
        {...register("note-update")}
        aria-busy={pending}
        className="rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        {pending ? "Saving…" : "Save note"}
      </button>
      {message ? (
        <p role="alert" className="text-xs text-red-600">
          {message}
        </p>
      ) : null}
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Error banner                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Banner for errors with no inline home: network failures, cart-level errors,
 * and errors referencing lines that no longer exist.
 */
export function CartErrorBanner() {
  const errors = useCart((state) => state.errors);
  const lines = useCart((state) => state.data.lines);
  const [dismissedAt, setDismissedAt] = useState(0);

  const lineIds = new Set((lines?.nodes ?? []).map((line) => line.id));
  const messages: string[] = [
    ...errors.network.map((entry) => entry.message),
    ...(errors.cart?.userErrors ?? []).map((error) => error.message),
  ];
  // Orphaned line errors: the line is gone, so there is no inline target.
  for (const [lineId, group] of errors.lines) {
    if (lineIds.has(lineId)) continue;
    for (const error of group.userErrors ?? []) messages.push(error.message);
  }

  const lastUpdatedAt = errors.lastUpdatedAt ?? 0;
  if (messages.length === 0 || lastUpdatedAt <= dismissedAt) return null;

  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
    >
      <ul className="space-y-1">
        {messages.map((message, index) => (
          <li key={`${message}-${index}`}>{message}</li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setDismissedAt(lastUpdatedAt)}
        className="shrink-0 text-xs underline"
      >
        Dismiss
      </button>
    </div>
  );
}
