import { shopifyImageUrl, srcSetFor, type ShopifyImageOptions } from "@/lib/image";

type ShopifyImageProps = ShopifyImageOptions & {
  /** A Storefront API image, or `null` when the resource has none. */
  image?: {
    url: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
  /** Falls back to the image's own `altText`. Pass `""` for decorative images. */
  alt?: string;
  className?: string;
  sizes?: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
};

/**
 * Renders a Shopify CDN image as a plain `<img>` with CDN-sized `src`/`srcSet`.
 *
 * Returns a neutral placeholder when the resource has no image, so grids keep
 * their aspect ratio instead of collapsing.
 */
export function ShopifyImage({
  image,
  alt,
  className,
  sizes,
  loading = "lazy",
  fetchPriority,
  ...options
}: ShopifyImageProps) {
  if (!image?.url) {
    return (
      <div
        className={`flex items-center justify-center bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600 ${className ?? ""}`}
        aria-hidden="true"
      >
        <svg
          className="h-8 w-8"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M18 10.5h.008v.008H18V10.5zm2.25 6.75V6.75A2.25 2.25 0 0018 4.5H6a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 006 19.5h12a2.25 2.25 0 002.25-2.25z"
          />
        </svg>
      </div>
    );
  }

  return (
    /*
     * A plain <img>, not next/image: Hydrogen ships no Image component and the
     * Shopify CDN already does the resizing, which `shopifyImageUrl` requests
     * through `width`/`height`/`crop` params. Routing these through Next's
     * optimizer would re-encode images the CDN has already optimized.
     */
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={shopifyImageUrl(image.url, options)}
      srcSet={options.width ? srcSetFor(image.url, options) : undefined}
      sizes={sizes}
      alt={alt ?? image.altText ?? ""}
      width={options.width ?? image.width ?? undefined}
      height={options.height ?? image.height ?? undefined}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding="async"
      className={className}
    />
  );
}
