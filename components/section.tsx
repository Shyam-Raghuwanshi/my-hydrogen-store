import Link from "next/link";
import type { ReactNode } from "react";

/** Standard page section with a heading row and optional "see all" link. */
export function Section({
  title,
  description,
  href,
  hrefLabel = "View all",
  children,
}: {
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 max-w-prose text-neutral-600 dark:text-neutral-400">
              {description}
            </p>
          ) : null}
        </div>
        {href ? (
          <Link
            href={href}
            className="text-sm font-medium text-neutral-900 underline-offset-4 hover:underline dark:text-neutral-100"
          >
            {hrefLabel} &rarr;
          </Link>
        ) : null}
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}

/** Neutral empty state for a section with no data. */
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-neutral-300 px-6 py-12 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-500">
      {children}
    </p>
  );
}
