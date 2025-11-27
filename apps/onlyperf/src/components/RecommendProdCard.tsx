"use client";

import { Money } from "@shopify/hydrogen-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import type { StorefrontProduct } from "../lib/shopify/storefront";
import { ProductCardSkeleton } from "./ProductCardSkeleton";

interface ProductCardProps {
  product: StorefrontProduct;
  compact?: boolean;
}

export function RecommendProdCard({
  product,
  compact = false,
}: ProductCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const displayImage = product.variant.image ?? product.featuredImage;
  const imageAlt = displayImage?.altText || product.title;

  return (
    <article className="flex h-full flex-col ">
      <Link
        href={`/products/${product.handle}`}
        className="group relative mb-3 block aspect-square overflow-hidden bg-zinc-50"
        aria-label={`Xem ${product.title}`}
      >
        {displayImage ? (
          <>
            {/* Show skeleton while image is loading */}
            {!imageLoaded && (
              <div className="absolute inset-0">
                <ProductCardSkeleton />
              </div>
            )}
            {/* Image with opacity transition */}
            <Image
              src={displayImage.url}
              alt={imageAlt}
              fill
              sizes="(min-width: 1280px) 240px, (min-width: 640px) 50vw, 100vw"
              className={`object-cover rounded-sm object-center transition-all duration-700 group-hover:scale-[1.01] ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setImageLoaded(true)}
            />
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            Chưa có hình ảnh
          </div>
        )}
      </Link>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm hover:cursor-default font-medium text-zinc-900">
          <p className="text-base font-semibold">{product.title}</p>
        </h3>
        <Money
          as="span"
          data={{
            amount: product.variant.price.amount,
            currencyCode: product.variant.price.currencyCode as any,
          }}
          className="whitespace-nowrap text-sm font-medium text-zinc-900"
        />
      </div>
    </article>
  );
}
