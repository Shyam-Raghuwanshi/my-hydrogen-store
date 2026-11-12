"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { AnalyticsEvent, getAnalytics } from "@/lib/analytics";

/**
 * Publishes `page_viewed` on every route transition, client-side navigations
 * included.
 *
 * `useSearchParams()` opts this client tree out of static rendering, which is
 * why the root layout keeps it inside its own `<Suspense>` boundary — the
 * opt-out stays scoped to the tracker rather than the whole layout.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = `${pathname}?${searchParams?.toString() ?? ""}`;

  useEffect(() => {
    getAnalytics()?.publish(AnalyticsEvent.PAGE_VIEWED);
  }, [key]);

  return null;
}
