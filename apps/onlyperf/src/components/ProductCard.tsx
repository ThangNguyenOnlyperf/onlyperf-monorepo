"use client";

import { Money, ProductProvider } from "@shopify/hydrogen-react";
import { CheckIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useAddToCart } from "@/hooks/useAddToCart";
import {
  extractColorOption,
  normalizeToken,
  resolveSwatchColor,
} from "@/lib/shopify/variant-utils";
import type {
  StorefrontProduct,
  StorefrontProductVariant,
} from "../lib/shopify/storefront";
import { ProductCardSkeleton } from "./ProductCardSkeleton";

interface ProductCardProps {
  product: StorefrontProduct;
  compact?: boolean;
}

interface VariantChoice {
  variant: StorefrontProductVariant;
  colorName: string | null;
  swatchColor: string | null;
  label: string;
}

export function ProductCard({ product, compact = false }: ProductCardProps) {
  const [selectedVariantId, setSelectedVariantId] = useState(
    product.variant.id,
  );
  const { isAdding, showSuccess, addToCart } = useAddToCart();

  const variantChoices = useMemo(() => {
    const seenColorKeys = new Set<string>();

    return product.variants.reduce<VariantChoice[]>((choices, variant) => {
      const colorName = extractColorOption(variant.selectedOptions);
      const swatchColor = resolveSwatchColor(variant.colorHex, colorName);
      const normalizedColorKey = colorName
        ? normalizeToken(colorName)
        : variant.id;

      if (colorName && seenColorKeys.has(normalizedColorKey)) {
        return choices;
      }

      if (colorName) {
        seenColorKeys.add(normalizedColorKey);
      }

      const label = colorName ?? variant.title;

      choices.push({ variant, colorName, swatchColor, label });
      return choices;
    }, []);
  }, [product.variants]);

  const selectedVariant = useMemo(() => {
    return (
      product.variants.find((variant) => variant.id === selectedVariantId) ??
      product.variant
    );
  }, [product.variants, product.variant, selectedVariantId]);

  const displayImage = selectedVariant.image ?? product.featuredImage;
  const selectedLabel = useMemo(() => {
    const fromOptions = extractColorOption(selectedVariant.selectedOptions);
    return fromOptions ?? selectedVariant.title;
  }, [selectedVariant]);

  const imageAlt = displayImage?.altText
    ? displayImage.altText
    : `${product.title}${selectedLabel ? ` - ${selectedLabel}` : ""}`;

  const handleAddToCart = async () => {
    await addToCart({
      merchandiseId: selectedVariant.id,
      quantity: 1,
    });
  };

  return (
    <ProductProvider
      data={product as any}
      initialVariantId={selectedVariant.id}
    >
      <article className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white/70 p-4 shadow-sm shadow-zinc-200/40 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60 dark:shadow-black/20">
        <Link
          href={`/products/${product.handle}`}
          className="relative mb-4 block aspect-square overflow-hidden rounded-lg bg-zinc-100 transition hover:opacity-95 dark:bg-zinc-800"
          aria-label={`Xem ${product.title}`}
        >
          {displayImage ? (
            <Image
              src={displayImage.url}
              alt={imageAlt}
              fill
              sizes="(min-width: 1280px) 240px, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              Chưa có hình ảnh
            </div>
          )}
        </Link>
        <div className="flex flex-1 flex-col">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
            <Link
              href={`/products/${product.handle}`}
              className="transition hover:text-brand dark:hover:text-brand"
            >
              {product.title}
            </Link>
          </h3>
          {!compact && (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {product.description || "Sản phẩm này chưa có mô tả."}
            </p>
          )}
          {!compact && variantChoices.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {variantChoices.map(
                ({ variant, colorName, swatchColor, label }) => {
                  const isActive = variant.id === selectedVariant.id;
                  const baseClasses = swatchColor
                    ? "flex h-8 w-8 items-center justify-center rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:focus-visible:outline-white"
                    : "inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:focus-visible:outline-white";
                  const activeClasses = swatchColor
                    ? "border-black ring-2 ring-black ring-offset-2 ring-offset-white dark:border-white dark:ring-white dark:ring-offset-zinc-900"
                    : "border-black bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black";
                  const inactiveClasses = swatchColor
                    ? "border-transparent hover:border-zinc-400 dark:hover:border-zinc-600"
                    : "border-transparent bg-zinc-200/60 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-200 dark:hover:bg-zinc-700";
                  const buttonClasses = `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`;

                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={buttonClasses}
                      aria-label={`Chọn biến thể ${label}`}
                      title={label}
                    >
                      {swatchColor ? (
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-white shadow-sm"
                          style={{ backgroundColor: swatchColor }}
                        />
                      ) : (
                        label
                      )}
                    </button>
                  );
                },
              )}
            </div>
          )}
          <div className="mt-auto">
            <div className="mt-4 flex items-center justify-between text-sm">
              <Money
                as="span"
                data={{
                  amount: selectedVariant.price.amount,
                  currencyCode: selectedVariant.price.currencyCode as any,
                }}
                className="text-base font-semibold text-zinc-900 dark:text-white"
              />
              <span
                className={`text-xs font-medium ${selectedVariant.availableForSale ? "text-brand" : "text-rose-500"}`}
              >
                {selectedVariant.availableForSale ? "Còn hàng" : "Hết hàng"}
              </span>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={
                !selectedVariant.availableForSale || isAdding || showSuccess
              }
              className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${
                showSuccess
                  ? "border-brand bg-brand text-white hover:bg-brand"
                  : "border-brand bg-white text-brand hover:bg-brand hover:text-white disabled:border-zinc-300 disabled:bg-zinc-100 disabled:text-zinc-400 dark:bg-zinc-900 dark:hover:bg-brand dark:hover:text-white disabled:dark:border-zinc-700 disabled:dark:bg-zinc-800 disabled:dark:text-zinc-600"
              }`}
              aria-label={`Đang thêm ${product.title} (${selectedLabel}) vào giỏ hàng`}
            >
              {showSuccess ? (
                <>
                  <CheckIcon className="h-4 w-4" />
                  Đã thêm
                </>
              ) : isAdding ? (
                "Đang thêm..."
              ) : selectedVariant.availableForSale ? (
                "Thêm vào giỏ"
              ) : (
                "Hết hàng"
              )}
            </button>
          </div>
        </div>
      </article>
    </ProductProvider>
  );
}
