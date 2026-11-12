"use client";

import {
  formatMoney,
  getFilterRemovalUrl,
  getSortByValue,
  isFilterInputActive,
  parseCollectionParams,
  serializeCollectionParams,
  type AvailableFilter,
  type CollectionState,
  type ProductFilter,
} from "@shopify/hydrogen";
import {
  CollectionProvider,
  useCollection,
  useCollectionForm,
} from "@shopify/hydrogen/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, type ChangeEvent, type Ref } from "react";

import { ProductCard } from "@/components/product-card";
import { displayLocale } from "@/lib/money";
import type { ProductCardData } from "@/lib/graphql/fragments";

const COLLECTION_SORT_OPTIONS = [
  { label: "Featured", value: getSortByValue("COLLECTION_DEFAULT", false) },
  { label: "Best selling", value: getSortByValue("BEST_SELLING", false) },
  { label: "Alphabetically, A–Z", value: getSortByValue("TITLE", false) },
  { label: "Alphabetically, Z–A", value: getSortByValue("TITLE", true) },
  { label: "Price, low to high", value: getSortByValue("PRICE", false) },
  { label: "Price, high to low", value: getSortByValue("PRICE", true) },
  { label: "Date, old to new", value: getSortByValue("CREATED", false) },
  { label: "Date, new to old", value: getSortByValue("CREATED", true) },
];

const SEARCH_SORT_OPTIONS = [
  { label: "Relevance", value: getSortByValue("RELEVANCE", false) },
  { label: "Price, low to high", value: getSortByValue("PRICE", false) },
  { label: "Price, high to low", value: getSortByValue("PRICE", true) },
];

type BrowserProps = {
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
  /** The server-committed search string for the products that were loaded. */
  dataSearch: string;
} & ({ mode: "collection"; handle: string } | { mode: "search"; term: string });

/**
 * Browse shell. `CollectionProvider` owns filter/sort intent and URL sync;
 * products always come from the server page, never from the store.
 */
export function CollectionBrowser(props: BrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.toString();

  // A synthetic handle for search rebuilds the browse store when the term
  // changes, so a new search does not carry the previous term's filters.
  const handle =
    props.mode === "collection" ? props.handle : `search:${props.term}`;

  return (
    <CollectionProvider
      data={{ handle, dataSearch: props.dataSearch }}
      urlSearch={urlSearch}
      onChange={(search) => {
        const href = `${pathname}${search}`;
        // `replace` once there is browse state, so filtering doesn't pile up
        // history entries; `scroll: false` keeps the grid in place.
        if (urlSearch) router.replace(href, { scroll: false });
        else router.push(href, { scroll: false });
        // The client URL can change before the RSC payload catches up.
        router.refresh();
      }}
    >
      <BrowserContent {...props} />
    </CollectionProvider>
  );
}

function BrowserContent(props: BrowserProps) {
  const state = useCollection();
  const { formProps } = useCollectionForm();
  const router = useRouter();
  const isLoading = state.status === "loading";

  const basePath =
    props.mode === "collection" ? `/collections/${props.handle}` : "/search";
  const sortOptions =
    props.mode === "collection" ? COLLECTION_SORT_OPTIONS : SEARCH_SORT_OPTIONS;
  const term = props.mode === "search" ? props.term : undefined;

  const hasAdvertisedPriceRange = props.availableFilters.some(
    (filter) => filter.type === "PRICE_RANGE",
  );
  const checkboxGroups = props.availableFilters.filter(
    (filter) => filter.type !== "PRICE_RANGE",
  );
  // The Storefront API always accepts a price filter even when a store
  // advertises no filter metadata (mock.shop returns an empty `filters` list),
  // so offer the price control in that case too.
  const showPriceRange =
    hasAdvertisedPriceRange || props.availableFilters.length === 0;

  return (
    <form
      // `formProps()` only wires the submit handler — `method` and `action`
      // are set literally so filters degrade to a real GET submit with no JS.
      {...formProps()}
      method="get"
      action={basePath}
      className="mx-auto max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid lg:grid-cols-[16rem_1fr] lg:px-8"
    >
      {term !== undefined ? (
        // Keeps `q` on every filter/sort submit so filtering never erases the
        // search term.
        <input type="hidden" name="q" value={term} />
      ) : null}

      <aside className="mb-8 lg:mb-0">
        <div className="lg:sticky lg:top-24">
          <h2 className="text-sm font-semibold tracking-wide uppercase">Filter</h2>

          <ActiveFilterChips basePath={basePath} state={state} term={term} />

          <div className="mt-6 space-y-6">
            {showPriceRange ? (
              <FilterSection title="Price">
                <PriceRangeInput
                  activeFilters={state.filters}
                  currencyCode={props.currencyCode}
                />
              </FilterSection>
            ) : null}

            {checkboxGroups.map((filter) => (
              // Stable key on filter identity, so a focused control stays
              // mounted across filter updates.
              <FilterSection key={filter.id} title={filter.label}>
                <ul className="space-y-2">
                  {filter.values.map((value) => (
                    <CheckboxFilterValue
                      key={value.id}
                      activeFilters={state.filters}
                      filter={filter}
                      value={value}
                    />
                  ))}
                </ul>
              </FilterSection>
            ))}

            {checkboxGroups.length === 0 && !showPriceRange ? (
              <p className="text-sm text-neutral-500">
                This collection has no filters.
              </p>
            ) : null}
          </div>

          {/* The sidebar auto-submits once hydrated; this is the no-JS path. */}
          <noscript>
            <button
              type="submit"
              className="mt-6 w-full rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-50 dark:text-neutral-900"
            >
              Apply filters
            </button>
          </noscript>
        </div>
      </aside>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4 dark:border-neutral-800">
          <p className="text-sm text-neutral-500" aria-live="polite">
            {props.totalCount !== null
              ? `${props.totalCount} ${props.totalCount === 1 ? "result" : "results"}`
              : `${props.products.length} ${props.products.length === 1 ? "product" : "products"}`}
            {isLoading ? " · updating…" : ""}
          </p>

          <label className="flex items-center gap-2 text-sm">
            <span className="text-neutral-500">Sort</span>
            <select
              name="sort_by"
              value={currentSortValue(state, sortOptions)}
              onChange={requestFormSubmit}
              className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              {sortOptions.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {props.products.length === 0 ? (
          <p className="py-20 text-center text-sm text-neutral-500">
            No products match these filters.
          </p>
        ) : (
          <div
            // Stale products stay visible with a pending visual state rather
            // than being replaced by a skeleton.
            className={`mt-8 grid grid-cols-2 gap-x-4 gap-y-8 transition-opacity sm:grid-cols-3 sm:gap-x-6 ${
              isLoading ? "opacity-60" : "opacity-100"
            }`}
            aria-busy={isLoading}
          >
            {props.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        <Pagination
          basePath={basePath}
          pageInfo={props.pageInfo}
          state={state}
          term={term}
          onNavigate={() => router.refresh()}
        />
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Controls                                                                   */
/* -------------------------------------------------------------------------- */

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{title}</legend>
      {children}
    </fieldset>
  );
}

function requestFormSubmit(
  event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
) {
  event.currentTarget.form?.requestSubmit();
}

function currentSortValue(
  state: CollectionState,
  options: { value: string }[],
) {
  const value = getSortByValue(state.sortKey ?? "RELEVANCE", state.reverse);
  return options.some((option) => option.value === value)
    ? value
    : options[0].value;
}

/**
 * Adapter from a Storefront API `FilterValue.input` JSON string to Hydrogen's
 * serializer. `value.input` is the authoritative filter identity — never derive
 * param names from filter IDs, labels, or types.
 */
function filterValueInputParamEntries(
  input: string,
): Array<{ name: string; value: string }> {
  let filter: ProductFilter;
  try {
    filter = JSON.parse(input) as ProductFilter;
  } catch {
    return [];
  }

  return Array.from(
    serializeCollectionParams({
      filters: [filter],
      sortKey: undefined,
      reverse: false,
    }),
    ([name, value]) => ({ name, value }),
  );
}

function CheckboxFilterValue({
  activeFilters,
  filter,
  value,
}: {
  activeFilters: ProductFilter[];
  filter: AvailableFilter;
  value: AvailableFilter["values"][number];
}) {
  const entries = filterValueInputParamEntries(value.input);
  if (entries.length !== 1) return null;

  const [{ name, value: paramValue }] = entries;
  const checked = isFilterInputActive(activeFilters, value.input);

  return (
    <li>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
        <input
          type="checkbox"
          name={name}
          value={paramValue}
          checked={checked}
          onChange={(event) => {
            // Single-choice groups serialize to one param name, so checking a
            // value must clear its siblings.
            if (isMutuallyExclusive(filter) && event.currentTarget.checked) {
              uncheckSiblings(event.currentTarget);
            }
            requestFormSubmit(event);
          }}
          className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-600"
        />
        <span>{value.label}</span>
        {typeof value.count === "number" ? (
          <span className="text-neutral-400">({value.count})</span>
        ) : null}
      </label>
    </li>
  );
}

/** True when every value in the group serializes to the same param name. */
function isMutuallyExclusive(filter: AvailableFilter) {
  const names = new Set<string>();
  for (const value of filter.values) {
    for (const entry of filterValueInputParamEntries(value.input)) {
      names.add(entry.name);
    }
  }
  return names.size === 1 && filter.values.length > 1;
}

function uncheckSiblings(input: HTMLInputElement) {
  const form = input.form;
  if (!form) return;
  for (const sibling of form.querySelectorAll<HTMLInputElement>(
    `input[type="checkbox"][name="${CSS.escape(input.name)}"]`,
  )) {
    if (sibling !== input) sibling.checked = false;
  }
}

function PriceRangeInput({
  activeFilters,
  currencyCode,
}: {
  activeFilters: ProductFilter[];
  currencyCode: string;
}) {
  // One timer shared by both inputs, so editing min then max submits once.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minInput = useRef<HTMLInputElement>(null);
  const maxInput = useRef<HTMLInputElement>(null);

  const price = activeFilters.find((filter) => filter.price)?.price;
  const min = price?.min ?? "";
  const max = price?.max ?? "";

  // The narrow symbol drops currency qualifiers ($ rather than CA$), and an
  // explicit stable locale keeps server and client markup identical.
  const symbol = formatMoney(
    { amount: "0", currencyCode: currencyCode as never },
    { locale: displayLocale },
  ).currencyNarrowSymbol;

  // Update the mounted inputs in place when bounds change externally (chips,
  // clear-all), while keeping newer typing from the shopper's own submission.
  useEffect(() => {
    for (const [input, value] of [
      [minInput.current, min],
      [maxInput.current, max],
    ] as const) {
      if (!input) continue;
      const matches =
        value === ""
          ? input.value === ""
          : input.value !== "" && Number(input.value) === value;
      if (!matches) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        input.value = value === "" ? "" : String(value);
      }
    }
  }, [min, max]);

  useEffect(() => {
    function cancelPendingSubmit() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    }

    function restoreHistoryPrice() {
      // Cancel drafts before history data loads, even if the price is unchanged.
      cancelPendingSubmit();
      const { filters } = parseCollectionParams(
        new URLSearchParams(window.location.search),
      );
      const historyPrice = filters.find((filter) => filter.price)?.price;
      if (minInput.current)
        minInput.current.value = String(historyPrice?.min ?? "");
      if (maxInput.current)
        maxInput.current.value = String(historyPrice?.max ?? "");
    }

    // Any submit (native Enter included) already carries the typed price.
    const form = minInput.current?.form;
    form?.addEventListener("submit", cancelPendingSubmit);
    window.addEventListener("popstate", restoreHistoryPrice);
    return () => {
      form?.removeEventListener("submit", cancelPendingSubmit);
      window.removeEventListener("popstate", restoreHistoryPrice);
      cancelPendingSubmit();
    };
  }, []);

  function submitAfterTyping(event: ChangeEvent<HTMLInputElement>) {
    if (timer.current) clearTimeout(timer.current);
    const form = event.currentTarget.form;
    timer.current = setTimeout(() => {
      timer.current = null;
      form?.requestSubmit();
    }, 350);
  }

  return (
    <div className="flex items-center gap-2">
      <PriceInput
        inputRef={minInput}
        name="filter.v.price.gte"
        defaultValue={min}
        label={`Minimum price in ${currencyCode}`}
        symbol={symbol}
        onChange={submitAfterTyping}
      />
      <span className="text-neutral-400" aria-hidden="true">
        –
      </span>
      <PriceInput
        inputRef={maxInput}
        name="filter.v.price.lte"
        defaultValue={max}
        label={`Maximum price in ${currencyCode}`}
        symbol={symbol}
        onChange={submitAfterTyping}
      />
    </div>
  );
}

function PriceInput({
  inputRef,
  name,
  defaultValue,
  label,
  symbol,
  onChange,
}: {
  inputRef: Ref<HTMLInputElement>;
  name: string;
  defaultValue: number | "";
  label: string;
  symbol: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    // The symbol sits outside the input, so the submitted value — and the URL
    // param — stays a plain number.
    <span className="inline-flex min-w-0 flex-1 items-center gap-1 rounded-lg border border-neutral-300 px-2 py-1.5 focus-within:border-neutral-900 dark:border-neutral-700 dark:focus-within:border-neutral-100">
      <span className="text-sm text-neutral-500" aria-hidden="true">
        {symbol}
      </span>
      <input
        ref={inputRef}
        type="number"
        name={name}
        defaultValue={defaultValue}
        aria-label={label}
        min="0"
        step="any"
        inputMode="decimal"
        onChange={onChange}
        className="w-full min-w-0 bg-transparent text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Chips and pagination                                                       */
/* -------------------------------------------------------------------------- */

function ActiveFilterChips({
  basePath,
  state,
  term,
}: {
  basePath: string;
  state: CollectionState;
  term?: string;
}) {
  const router = useRouter();
  if (state.filters.length === 0) return null;

  const currentParams = serializeCollectionParams(state);

  function withTerm(search: string) {
    // Removing a filter must not drop `q` — the route owns filters, not search.
    if (term === undefined) return search;
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    params.set("q", term);
    return `?${params.toString()}`;
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {state.filters.map((filter, index) => {
        const removal = getFilterRemovalUrl(currentParams, filter);
        const search = withTerm(removal === "?" ? "" : removal);
        const href = search ? `${basePath}${search}` : basePath;

        return (
          <Link
            key={`${describeFilter(filter)}-${index}`}
            href={href}
            scroll={false}
            onClick={() => router.refresh()}
            className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            {describeFilter(filter)}
            <span aria-hidden="true">&times;</span>
            <span className="sr-only">Remove filter</span>
          </Link>
        );
      })}
      <Link
        href={term !== undefined ? `${basePath}?q=${encodeURIComponent(term)}` : basePath}
        scroll={false}
        onClick={() => router.refresh()}
        className="inline-flex items-center rounded-full border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        Clear all
      </Link>
    </div>
  );
}

function describeFilter(filter: ProductFilter): string {
  if (filter.price) {
    const { min, max } = filter.price;
    if (min != null && max != null) return `${min} – ${max}`;
    if (min != null) return `From ${min}`;
    if (max != null) return `Up to ${max}`;
    return "Price";
  }
  if (filter.available != null) return filter.available ? "In stock" : "Out of stock";
  if (filter.productType) return filter.productType;
  if (filter.productVendor) return filter.productVendor;
  if (filter.tag) return filter.tag;
  if (filter.variantOption?.value) return filter.variantOption.value;
  return "Filter";
}

/**
 * Pagination as real GET links carrying the cursor, so paging works with no
 * JavaScript. `before`/`after` are dropped whenever filters or sort change —
 * `serializeCollectionParams` only emits browse state, never cursors.
 */
function Pagination({
  basePath,
  pageInfo,
  state,
  term,
  onNavigate,
}: {
  basePath: string;
  pageInfo: BrowserProps["pageInfo"];
  state: CollectionState;
  term?: string;
  onNavigate: () => void;
}) {
  if (!pageInfo.hasNextPage && !pageInfo.hasPreviousPage) return null;

  function buildHref(cursorKey: "before" | "after", cursor: string) {
    const params = new URLSearchParams(serializeCollectionParams(state));
    if (term !== undefined) params.set("q", term);
    params.delete("before");
    params.delete("after");
    params.set(cursorKey, cursor);
    return `${basePath}?${params.toString()}`;
  }

  return (
    <nav className="mt-12 flex justify-center gap-3" aria-label="Pagination">
      {pageInfo.hasPreviousPage && pageInfo.startCursor ? (
        <Link
          href={buildHref("before", pageInfo.startCursor)}
          onClick={onNavigate}
          className="rounded-full border border-neutral-300 px-5 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          &larr; Previous
        </Link>
      ) : null}
      {pageInfo.hasNextPage && pageInfo.endCursor ? (
        <Link
          href={buildHref("after", pageInfo.endCursor)}
          onClick={onNavigate}
          className="rounded-full border border-neutral-300 px-5 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Next &rarr;
        </Link>
      ) : null}
    </nav>
  );
}
