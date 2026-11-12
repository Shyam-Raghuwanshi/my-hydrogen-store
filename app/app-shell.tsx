import { connection } from "next/server";
import type { ReactNode } from "react";

import { Providers } from "@/app/providers";
import { readCart } from "@/lib/cart-read";

/**
 * Dynamic boundary that seeds the cart.
 *
 * Under Cache Components the root layout must stay a static shell, so this
 * async child lives inside `<Suspense>` and calls `connection()` to opt into
 * dynamic rendering. The cart promise is deliberately *not* awaited here —
 * passing it unresolved keeps the shell non-blocking.
 */
export async function AppShell({ children }: { children: ReactNode }) {
  await connection();

  const cartData = readCart();

  return <Providers cartData={cartData}>{children}</Providers>;
}
