import { formatMoney, type MoneyV2 } from "@shopify/hydrogen";

import { i18n } from "@/lib/i18n";

/**
 * BCP 47 locale for `Intl`, derived from the storefront's i18n definition.
 * Single-market storefront, so this is a constant; a market-aware store must
 * pass the *active* locale instead of defaulting.
 */
export const displayLocale = `${i18n.defaultLocale.language.toLowerCase()}-${i18n.defaultLocale.country.toUpperCase()}`;

/**
 * Formats a Storefront API `MoneyV2` for display.
 *
 * Always render server-provided money fields through this. Never concatenate a
 * currency symbol, call `.toFixed()`, or multiply quantity by unit price in the
 * browser — discounts, duties, tax, rounding, and selling plans all make that
 * wrong.
 */
export function formatPrice(
  money: MoneyV2,
  options: { withoutTrailingZeros?: boolean } = {},
): string {
  return formatMoney(money, { locale: displayLocale, ...options }).toString();
}

/**
 * Formats a price range. Returns a single formatted price when both ends match,
 * so a fixed-price product does not render "$20.00 – $20.00".
 */
export function formatPriceRange(min: MoneyV2, max: MoneyV2): string {
  if (min.amount === max.amount && min.currencyCode === max.currencyCode) {
    return formatPrice(min);
  }
  return formatMoney([min, max], { locale: displayLocale }).toString();
}

export type { MoneyV2 };
