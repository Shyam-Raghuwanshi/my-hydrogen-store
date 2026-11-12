import { createShopifyRequestContext } from "@shopify/hydrogen";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import {
  customerSession,
  getReadonlyCustomerSessionManager,
  isCustomerAccountConfigured,
  SESSION_COOKIE,
} from "@/lib/customer-session";
import { i18n } from "@/lib/i18n";
import {
  createCustomerAccountClient,
  CUSTOMER_QUERY,
} from "@/lib/queries/customer";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function AccountPage({ searchParams }: PageProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Account</h1>
      <Suspense fallback={<Skeleton />}>
        <AccountContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AccountContent({ searchParams }: PageProps) {
  // Session state is request-time data, so it sits below an explicit dynamic
  // boundary under Cache Components.
  await connection();

  const params = await searchParams;
  const loginFailed = params.login === "failed";
  // One-shot guard: if the page still has no usable token after a refresh, fall
  // back to login instead of looping through /account/refresh.
  const alreadyRefreshed = params.refreshed === "1";

  if (!isCustomerAccountConfigured || !customerSession) {
    return <NotConfigured />;
  }

  const requestContext = createShopifyRequestContext({
    request: { headers: await headers() },
    i18n,
  });
  // Server Components get the read-only manager, so TypeScript rejects
  // `getOrRefreshAccessToken()` here — a refresh could not be committed from a
  // render path anyway.
  const sessionManager = await getReadonlyCustomerSessionManager(
    (await cookies()).get(SESSION_COOKIE)?.value,
  );

  const loggedIn = await customerSession.isLoggedIn(sessionManager, requestContext);
  if (!loggedIn) return <SignInPanel loginFailed={loginFailed} />;

  const accessToken = await customerSession.getAccessToken(
    sessionManager,
    requestContext,
  );

  if (!accessToken) {
    // Refreshable but not currently usable: delegate to the registered refresh
    // handler, which can commit new cookies, then come back here once.
    if (!alreadyRefreshed) {
      redirect("/account/refresh?return_to=/account%3Frefreshed%3D1");
    }
    return <SignInPanel loginFailed={false} refreshFailed />;
  }

  const client = createCustomerAccountClient({
    shopId: process.env.SHOP_ID!,
    requestContext,
  });

  let customer: {
    firstName: string | null;
    lastName: string | null;
    emailAddress: { emailAddress: string | null } | null;
  } | null = null;
  let failed = false;

  try {
    const { data, errors } = await client.graphql(CUSTOMER_QUERY, { accessToken });
    // A failing Customer Account call renders an error state, never a crash.
    if (errors) {
      console.error("[hydrogen] Customer Account query errors", errors);
      failed = true;
    }
    customer = data?.customer ?? null;
  } catch (error) {
    console.error("[hydrogen] Customer Account request failed", error);
    failed = true;
  }

  if (failed || !customer) return <ProfileError />;

  const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ");

  return (
    <div className="mt-8 space-y-8">
      {/* Only derived profile fields are rendered — never tokens or session objects. */}
      <dl className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        <div className="flex justify-between gap-4 px-5 py-4 text-sm">
          <dt className="text-neutral-500">Name</dt>
          <dd className="font-medium">{name || "—"}</dd>
        </div>
        <div className="flex justify-between gap-4 px-5 py-4 text-sm">
          <dt className="text-neutral-500">Email</dt>
          <dd className="font-medium">
            {customer.emailAddress?.emailAddress ?? "—"}
          </dd>
        </div>
      </dl>

      <LogoutForm />
    </div>
  );
}

/**
 * A native form, not a client form component or a `fetch`: the logout handler
 * enforces a same-origin POST and answers with a raw redirect that only a
 * browser submit follows. This also keeps logout working without JavaScript.
 */
function LogoutForm() {
  return (
    <form method="post" action="/account/logout">
      <button
        type="submit"
        className="rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-medium transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        Log out
      </button>
    </form>
  );
}

function SignInPanel({
  loginFailed,
  refreshFailed = false,
}: {
  loginFailed: boolean;
  refreshFailed?: boolean;
}) {
  return (
    <div className="mt-8 rounded-2xl border border-neutral-200 p-8 dark:border-neutral-800">
      <h2 className="text-lg font-medium">Sign in</h2>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Sign in with your Shopify customer account to see your profile and order
        history.
      </p>
      {loginFailed ? (
        <p role="alert" className="mt-4 text-sm text-red-600">
          Sign-in did not complete. Please try again.
        </p>
      ) : null}
      {refreshFailed ? (
        <p role="alert" className="mt-4 text-sm text-red-600">
          Your session expired. Please sign in again.
        </p>
      ) : null}
      {/*
        A plain <a>, deliberately not next/link: the login handler returns a raw
        redirect to Shopify's hosted login page, which client-side routing
        cannot follow.
      */}
      <a
        href="/account/login?return_to=/account"
        className="mt-6 inline-flex items-center justify-center rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        Sign in
      </a>
    </div>
  );
}

function ProfileError() {
  return (
    <div className="mt-8 rounded-2xl border border-neutral-200 p-8 dark:border-neutral-800">
      <h2 className="text-lg font-medium">We couldn&rsquo;t load your profile</h2>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Something went wrong talking to Shopify. Please try again shortly.
      </p>
      <div className="mt-6">
        <LogoutForm />
      </div>
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-neutral-300 p-8 dark:border-neutral-700">
      <h2 className="text-lg font-medium">Customer accounts are not configured</h2>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        This storefront is running against a mock catalog, which has no Customer
        Account API. Set <code className="font-mono">SHOP_ID</code>,{" "}
        <code className="font-mono">PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID</code>{" "}
        and <code className="font-mono">CUSTOMER_ACCOUNT_SESSION_SECRET</code> to
        enable sign-in.
      </p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="mt-8 h-48 animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
  );
}
