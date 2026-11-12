"use client";

import { useState } from "react";

import { ShopifyImage } from "@/components/shopify-image";
import { useProduct } from "@/lib/product";
import type { ProductData } from "@/lib/queries/product";

type GalleryImage = {
  id: string;
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
};

/**
 * Product image gallery. The hero follows the selected variant's image when it
 * has one, so picking a colour swatch updates the picture.
 */
export function ProductGallery({ product }: { product: ProductData }) {
  const { selectedVariant } = useProduct();
  const [activeId, setActiveId] = useState<string | null>(null);

  const images: GalleryImage[] = [];
  for (const node of product.media.nodes) {
    const image = node.__typename === "MediaImage" ? node.image : node.previewImage;
    if (image?.url) {
      images.push({
        id: node.id,
        url: image.url,
        altText: image.altText ?? node.alt,
        width: image.width,
        height: image.height,
      });
    }
  }

  const variantImage = selectedVariant?.image;
  // Variant image wins, then an explicitly picked thumbnail, then the first.
  const hero: GalleryImage | undefined = variantImage?.url
    ? {
        id: "variant",
        url: variantImage.url,
        altText: variantImage.altText,
        width: variantImage.width,
        height: variantImage.height,
      }
    : (images.find((image) => image.id === activeId) ?? images[0]);

  return (
    <div className="space-y-4">
      <div className="aspect-4/5 overflow-hidden rounded-3xl bg-neutral-100 dark:bg-neutral-900">
        <ShopifyImage
          image={hero}
          alt={hero?.altText ?? product.title}
          width={900}
          height={1125}
          crop="center"
          sizes="(min-width: 1024px) 45vw, 100vw"
          loading="eager"
          fetchPriority="high"
          className="h-full w-full object-cover"
        />
      </div>

      {images.length > 1 ? (
        <ul className="grid grid-cols-4 gap-3 sm:grid-cols-5">
          {images.map((image) => {
            const isActive = hero?.url === image.url;
            return (
              <li key={image.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(image.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={`block aspect-square w-full overflow-hidden rounded-xl border-2 transition ${
                    isActive
                      ? "border-neutral-900 dark:border-neutral-50"
                      : "border-transparent hover:border-neutral-300 dark:hover:border-neutral-700"
                  }`}
                >
                  <ShopifyImage
                    image={image}
                    alt={image.altText ?? `${product.title} thumbnail`}
                    width={160}
                    height={160}
                    crop="center"
                    className="h-full w-full object-cover"
                  />
                  <span className="sr-only">Show image</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
