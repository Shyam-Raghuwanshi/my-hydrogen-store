import { handleShopifyRedirects } from "@shopify/hydrogen";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { routeTemplates } from "@/lib/route-templates";
import { getStorefrontClient } from "@/lib/storefront";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      {/*
        Shopify's URL redirects are checked only after Next has already decided
        this is a 404. Kept under Suspense with `connection()` so the static
        shell still prerenders under Cache Components.
      */}
      <Suspense fallback={null}>
        <RedirectChecker />
      </Suspense>
      <p className="text-sm font-medium tracking-widest text-neutral-400 uppercase">
        Error 404
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
        We couldn&rsquo;t find that page
      </h1>
      <p className="mt-4 text-neutral-600 dark:text-neutral-400">
        The page may have moved, or the product may no longer be available.
      </p>
      <Link
        href="/collections"
        className="mt-8 inline-flex items-center justify-center rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        Continue shopping
      </Link>
    </div>
  );
}

async function RedirectChecker() {
  await connection();
  const url = (await headers()).get("x-storefront-url");
  if (!url) return null;

  const result = await handleShopifyRedirects({
    request: new Request(url),
    routeTemplates,
    storefrontClient: await getStorefrontClient(),
  });

  const location = result?.headers.get("location");
  // Next's `redirect()` does not preserve Hydrogen's 301 status.
  if (location) redirect(location);

  return null;
}
