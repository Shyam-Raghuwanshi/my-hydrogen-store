import "server-only";

import {
  createCustomerSession,
  type ReadonlyCustomerSessionManager,
  type WritableCustomerSessionManager,
} from "@shopify/hydrogen/customer-account";

const SESSION_COOKIE = "customer_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 14; // 14 days

const shopId = process.env.SHOP_ID;
const customerAccountApiClientId = process.env.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID;
const sessionSecret = process.env.CUSTOMER_ACCOUNT_SESSION_SECRET;

/**
 * Whether the Customer Account API is configured for this deployment.
 *
 * mock.shop has no Customer Account API, so the storefront must run without
 * these variables. When they are absent the account handlers are not
 * registered and `/account` renders a "not configured" panel instead of
 * sending buyers to an OAuth flow that cannot work.
 */
export const isCustomerAccountConfigured = Boolean(
  shopId && customerAccountApiClientId && sessionSecret,
);

/**
 * Module-scope customer session. `null` when the Customer Account API is not
 * configured — `createCustomerSession` throws on an empty client ID.
 */
export const customerSession = isCustomerAccountConfigured
  ? createCustomerSession({
      shopId: shopId!,
      customerAccountApiClientId: customerAccountApiClientId!,
    })
  : null;

/* -------------------------------------------------------------------------- */
/* Encrypted cookie session storage                                           */
/* -------------------------------------------------------------------------- */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

let keyPromise: Promise<CryptoKey> | undefined;

function getKey() {
  keyPromise ??= (async () => {
    const digest = await crypto.subtle.digest("SHA-256", encoder.encode(sessionSecret!));
    return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
      "encrypt",
      "decrypt",
    ]);
  })();
  return keyPromise;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function encryptSession(data: Record<string, unknown>) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      await getKey(),
      encoder.encode(JSON.stringify(data)),
    ),
  );
  return `${toBase64Url(iv)}.${toBase64Url(ciphertext)}`;
}

async function decryptSession(value: string): Promise<Record<string, unknown>> {
  try {
    const [ivPart, dataPart] = value.split(".");
    if (!ivPart || !dataPart) return {};
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64Url(ivPart) },
      await getKey(),
      fromBase64Url(dataPart),
    );
    const parsed: unknown = JSON.parse(decoder.decode(plaintext));
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    // Tampered, truncated, or encrypted under a rotated secret: start fresh.
    return {};
  }
}

function serializeCookie(value: string, maxAge: number, secure: boolean) {
  const attributes = [
    `${SESSION_COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (secure) attributes.push("Secure");
  return attributes.join("; ");
}

function readSessionCookie(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return rest.join("=");
  }
  return undefined;
}

/**
 * Creates a writable, request-scoped session manager backed by an encrypted
 * HttpOnly cookie.
 *
 * Only hand this to boundaries that can commit `Set-Cookie` on the response —
 * the registered `/account/*` handlers and the proxy response. Server
 * Components get `getReadonlyCustomerSessionManager()` instead, so TypeScript
 * rejects `getOrRefreshAccessToken()` there.
 *
 * Production apps should prefer opaque server-side sessions over cookie
 * storage; this keeps tokens off the client either way.
 */
export async function createSessionManager(
  request: Request,
): Promise<WritableCustomerSessionManager> {
  const origin = new URL(request.url).origin;
  const cookieValue = readSessionCookie(request);
  const data = cookieValue ? await decryptSession(cookieValue) : {};
  let dirty = false;

  return {
    getSessionOrigin: () => origin,
    getSessionItem: (key) => data[key],
    setSessionItem: (key, value) => {
      data[key] = value;
      dirty = true;
    },
    removeSessionItem: (key) => {
      delete data[key];
      dirty = true;
    },
    commit: async () => {
      if (!dirty) return;
      const secure = origin.startsWith("https://");
      if (Object.keys(data).length === 0) {
        return { "set-cookie": serializeCookie("", 0, secure) };
      }
      return {
        "set-cookie": serializeCookie(await encryptSession(data), SESSION_MAX_AGE, secure),
      };
    },
  };
}

/**
 * Read-only session manager for Server Components and layouts. It exposes only
 * `getSessionItem`, so render paths can call `isLoggedIn()` / `getAccessToken()`
 * but can never attempt a token refresh they could not commit.
 */
export async function getReadonlyCustomerSessionManager(
  cookieValue: string | undefined,
): Promise<ReadonlyCustomerSessionManager> {
  const data = cookieValue ? await decryptSession(cookieValue) : {};
  return { getSessionItem: (key) => data[key] };
}

export { SESSION_COOKIE };
