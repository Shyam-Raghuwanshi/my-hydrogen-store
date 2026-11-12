/**
 * A headless storefront serves its own robots.txt — Hydrogen ships no helper.
 * Without this route, `/robots.txt` falls through to the 404 page and crawlers
 * treat that as permission to crawl carts, account pages, checkout handoffs,
 * and every sort/filter permutation of every collection.
 *
 * This is a route handler (not `app/robots.ts`) so it can send a long
 * `Cache-Control`; Next's metadata route forces `must-revalidate`.
 *
 * robots.txt is not access control. Account pages and API endpoints stay
 * protected by authentication and server-side checks.
 */
const ROBOTS_TXT = `User-agent: *
Disallow: /admin
Disallow: /cart
Disallow: /account
Disallow: /checkout
Disallow: /buy/
Disallow: /api/
Disallow: /__shopify
Disallow: /search
Disallow: /collections/*sort_by*
Disallow: /collections/*filter*&*filter*

# Google AdsBot ignores the "*" group and follows only groups that name it.
User-agent: adsbot-google
Disallow: /cart
Disallow: /account
Disallow: /checkout
Disallow: /search
`;

export function GET() {
  return new Response(ROBOTS_TXT, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=86400",
    },
  });
}
