import { createCartFormRegister } from "@shopify/hydrogen";
import Link from "next/link";

import { ShopifyImage } from "@/components/shopify-image";
import type { CartData } from "@/lib/cart-read";
import { formatPrice } from "@/lib/money";

/** The path Hydrogen's registered cart handlers serve. */
const CART_API_PATH = "/api/cart";

// The register function is stateless and framework-neutral, so the server can
// use the exact same field contract the client binding uses.
const register = createCartFormRegister();

/**
 * Server-rendered cart, used as the Suspense fallback for the interactive
 * `CartView`.
 *
 * This is what makes `/cart` work without JavaScript: the real cart is already
 * in the initial HTML, and the forms post natively to `/api/cart`, which
 * answers a form submission with a 303 redirect back to the referring page.
 * Once React hydrates, `CartView` replaces this with the optimistic client
 * store.
 */
export function CartStaticView({ cart }: { cart: CartData["cart"] }) {
  const lines = cart?.lines?.nodes ?? [];

  if (lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Your cart is empty
        </h1>
        <p className="mt-3 text-neutral-600 dark:text-neutral-400">
          Browse the catalog and add something you like.
        </p>
        <Link
          href="/collections"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Your cart</h1>

      <div className="mt-6 grid gap-12 lg:grid-cols-[1fr_22rem]">
        <ul className="divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {lines.map((line) => {
            const merchandise = line.merchandise;
            const title =
              merchandise?.product?.title ?? merchandise?.title ?? "Product";
            const handle = merchandise?.product?.handle;
            const options = merchandise?.selectedOptions ?? [];

            return (
              <li key={line.id} className="flex gap-4 py-5">
                <ShopifyImage
                  image={merchandise?.image}
                  width={112}
                  height={140}
                  crop="center"
                  className="h-35 w-28 shrink-0 rounded-xl bg-neutral-100 object-cover dark:bg-neutral-800"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-medium">
                        {handle ? (
                          <Link href={`/products/${handle}`} className="hover:underline">
                            {title}
                          </Link>
                        ) : (
                          title
                        )}
                      </h2>
                      {options.length > 0 ? (
                        <p className="mt-0.5 truncate text-xs text-neutral-500">
                          {options.map((option) => option.value).join(" · ")}
                        </p>
                      ) : null}
                    </div>
                    {line.cost?.totalAmount ? (
                      <p className="text-sm font-semibold whitespace-nowrap">
                        {formatPrice(line.cost.totalAmount)}
                      </p>
                    ) : null}
                  </div>

                  {/* Same field contract as the hydrated form. */}
                  <form
                    method="post"
                    action={CART_API_PATH}
                    className="mt-3 flex items-center gap-3"
                  >
                    <input type="hidden" {...register("lineId", { value: line.id })} />
                    <div className="flex items-center rounded-full border border-neutral-300 dark:border-neutral-700">
                      <button
                        type="submit"
                        {...register("decrease")}
                        aria-label={`Decrease quantity of ${title}`}
                        className="px-3 py-1.5 text-sm leading-none"
                      >
                        &minus;
                      </button>
                      <input
                        {...register("quantity", {
                          value: line.quantity,
                          interactive: true,
                        })}
                        aria-label={`Quantity of ${title}`}
                        className="w-12 border-x border-neutral-300 bg-transparent py-1.5 text-center text-sm outline-none dark:border-neutral-700 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
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
                    <button {...register("set")}>Update</button>
                    <button
                      type="submit"
                      {...register("remove")}
                      className="text-xs text-neutral-500 underline-offset-2 hover:underline"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="space-y-8 lg:self-start">
          <div className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
            <dl className="space-y-2 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-neutral-600 dark:text-neutral-400">Subtotal</dt>
                <dd>
                  {cart?.cost?.subtotalAmount
                    ? formatPrice(cart.cost.subtotalAmount)
                    : "—"}
                </dd>
              </div>
              <p className="pt-1 text-xs text-neutral-500">
                Shipping and taxes calculated at checkout.
              </p>
              <div className="border-t border-neutral-200 pt-3 dark:border-neutral-800">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="font-medium">Total</dt>
                  <dd className="text-base font-semibold">
                    {cart?.cost?.totalAmount
                      ? formatPrice(cart.cost.totalAmount)
                      : "—"}
                  </dd>
                </div>
              </div>
            </dl>
            {cart?.checkoutUrl ? (
              <a
                href={cart.checkoutUrl}
                className="mt-6 block w-full rounded-full bg-neutral-900 px-6 py-3 text-center text-sm font-medium text-white dark:bg-neutral-50 dark:text-neutral-900"
              >
                Checkout
              </a>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
