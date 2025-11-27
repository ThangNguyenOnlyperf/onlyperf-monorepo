"use client";

import { AddToCartButton, Money } from "@shopify/hydrogen-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useWindowSize } from "@/components/hooks/use-window-size";
import { cn } from "@/components/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  StorefrontProduct,
  StorefrontProductVariant,
} from "@/lib/shopify/storefront";
import { PreviewButton } from "./PreviewButton";
import { ProductPreview } from "./ProductPreview";

interface VariantCardProps {
  product: StorefrontProduct;
  variant: StorefrontProductVariant;
}

function resolveVariantLabel(variant: StorefrontProductVariant) {
  const normalizedTitle = variant.title.trim().toLowerCase();
  if (normalizedTitle === "default" || normalizedTitle === "default title") {
    return null;
  }
  return variant.title;
}

export function VariantCard({ product, variant }: VariantCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { width } = useWindowSize({ initializeWithValue: true });
  const isDesktop = width !== undefined && width >= 1024;

  const image = variant.image ?? product.featuredImage;
  const variantLabel = resolveVariantLabel(variant);
  const isAvailable = variant.availableForSale;
  const moneyData = {
    amount: variant.price.amount,
    currencyCode: variant.price.currencyCode as any,
  };

  const handlePreviewClick = () => {
    setIsPreviewOpen(true);
  };

  const handlePreviewClose = () => {
    setIsPreviewOpen(false);
  };

  return (
    <article className="flex h-full flex-col overflow-hidden bg-white dark:bg-zinc-900">
      <div
        className="group relative block aspect-[3/4] overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Link
          href={`/products/${product.handle}`}
          aria-label={`Xem ${product.title}`}
          className="block w-full h-full"
        >
          {image ? (
            <Image
              src={image.url}
              alt={image.altText ?? product.title}
              fill
              loading="lazy"
              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
              className={cn(
                "object-cover transition duration-700",
                isHovered && isDesktop && "scale-105",
              )}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-zinc-100 text-sm text-zinc-500">
              Chưa có hình ảnh
            </div>
          )}
        </Link>

        {/* Preview Button - Only show on desktop when hovered */}
        {isHovered && isDesktop && (
          <PreviewButton onClick={handlePreviewClick} />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 pl-0">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            OnlyPerf
          </p>
          <h3 className="text-sm font-medium text-zinc-900 transition hover:text-emerald-600 dark:text-white dark:hover:text-emerald-400">
            <Link href={`/products/${product.handle}`}>{product.title}</Link>
          </h3>
          {variantLabel && (
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {variantLabel}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between text-xs">
          <Money
            data={moneyData}
            className="text-sm font-medium text-zinc-900 dark:text-white"
          />
          <span
            className={`text-xs font-medium ${isAvailable ? "text-emerald-600" : "text-rose-500"}`}
          >
            {isAvailable ? "Còn hàng" : "Hết hàng"}
          </span>
        </div>
      </div>

      <ProductPreview
        isOpen={isPreviewOpen}
        onClose={handlePreviewClose}
        productHandle={product.handle}
        initialVariant={variant}
      />
    </article>
  );
}
