import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";

import { AppShell } from "@/app/app-shell";
import { CartAnalytics } from "@/components/analytics/view-trackers";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { ShopifyRuntime } from "@/components/shopify-runtime";
import { shopifyScriptsI18n, shopifyScriptsShop } from "@/lib/shopify-scripts";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Hydrogen Store",
    template: "%s · Hydrogen Store",
  },
  description:
    "A modern headless Shopify storefront built with Next.js and Shopify Hydrogen.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-full focus:bg-neutral-900 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to content
        </a>
        {/*
          The layout itself stays a static shell under Cache Components; the
          cart-seeding dynamic work happens inside `AppShell`, below this
          boundary.

          The fallback renders chrome only — deliberately *not* `children`.
          Page content must render inside `CartProvider`, because
          `ProductProvider` and the cart forms read the cart store; rendering
          children in the fallback would put them outside the provider and
          throw "ProductProvider must be used inside <CartProvider>".
        */}
        {/*
          Shopify's browser runtime, rendered exactly once. The cart store
          sends every mutation through `window.Shopify.actions`, so this must
          be present before any cart interaction.
        */}
        <ShopifyRuntime shop={shopifyScriptsShop} i18n={shopifyScriptsI18n} />

        {/*
          `useSearchParams()` inside the tracker opts its client tree out of
          static rendering; its own Suspense boundary keeps that scoped to the
          tracker rather than the whole layout.
        */}
        <Suspense fallback={null}>
          <PageViewTracker />
        </Suspense>

        <Suspense fallback={<ChromeOnly />}>
          <AppShell>
            <SiteHeader />
            <main id="main" className="flex-1">
              {children}
            </main>
            <SiteFooter />
            {/* Rendered once, inside CartProvider, so it works on every page. */}
            <CartDrawer />
            {/* Cart change events, subscribed once inside CartProvider. */}
            <CartAnalytics />
          </AppShell>
        </Suspense>
      </body>
    </html>
  );
}

/**
 * Header and footer with an empty main, shown while the cart read resolves.
 * It renders outside `CartProvider`, so the cart count is switched off here.
 */
function ChromeOnly() {
  return (
    <>
      <SiteHeader cartCount={false} />
      <main id="main" className="flex-1" />
      <SiteFooter />
    </>
  );
}
