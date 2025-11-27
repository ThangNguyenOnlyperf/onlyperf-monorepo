import { useMemo, useState } from "react";

import type {
  StorefrontProductDetail,
  StorefrontProductVariant,
} from "@/lib/shopify/storefront";
import {
  extractColorOption,
  extractSizeOption,
  normalizeToken,
  resolveSwatchColor,
} from "@/lib/shopify/variant-utils";

interface VariantSummary {
  variant: StorefrontProductVariant;
  size: string | null;
  color: string | null;
  colorToken: string | null;
  swatchColor: string | null;
}

interface ColorOption {
  token: string;
  label: string;
  swatchColor: string | null;
}

/**
 * Custom hook for managing product variant selection logic
 * Handles size and color options, variant summaries, and selected variant state
 *
 * @param variants - Array of product variants
 * @param defaultVariant - The default/initial variant
 * @returns Variant selection state and handlers
 */
export function useProductVariantSelection(
  variants: StorefrontProductVariant[],
  defaultVariant: StorefrontProductVariant,
) {
  // Create summaries with all variant data
  const variantSummaries = useMemo<VariantSummary[]>(() => {
    return variants.map((variant) => {
      const size = extractSizeOption(variant.selectedOptions);
      const color = extractColorOption(variant.selectedOptions);
      const swatchColor = resolveSwatchColor(variant.colorHex, color);
      const colorToken = color ? normalizeToken(color) : null;
      return { variant, size, color, colorToken, swatchColor };
    });
  }, [variants]);

  // Extract initial size
  const initialSize = useMemo(() => {
    return (
      extractSizeOption(defaultVariant.selectedOptions) ||
      variantSummaries.find((v) => Boolean(v.size))?.size ||
      null
    );
  }, [defaultVariant.selectedOptions, variantSummaries]);

  // Extract initial color token
  const initialColorToken = useMemo(() => {
    const c = extractColorOption(defaultVariant.selectedOptions);
    return c ? normalizeToken(c) : null;
  }, [defaultVariant.selectedOptions]);

  // Extract unique size options
  const sizeOptions = useMemo(() => {
    return Array.from(
      new Set(
        variantSummaries
          .map((s) => s.size)
          .filter((v): v is string => Boolean(v)),
      ),
    );
  }, [variantSummaries]);

  // Extract unique color options with swatches
  const colorOptions = useMemo<ColorOption[]>(() => {
    const map = new Map<
      string,
      { label: string; swatchColor: string | null }
    >();

    for (const s of variantSummaries) {
      if (!s.color || !s.colorToken) continue;

      const existing = map.get(s.colorToken);
      if (existing) {
        // Update if we find a better swatch color
        if (!existing.swatchColor && s.swatchColor) {
          map.set(s.colorToken, { label: s.color, swatchColor: s.swatchColor });
        }
        continue;
      }

      map.set(s.colorToken, { label: s.color, swatchColor: s.swatchColor });
    }

    return Array.from(map.entries()).map(([token, v]) => ({ token, ...v }));
  }, [variantSummaries]);

  // Selection state
  const [selectedSize, setSelectedSize] = useState<string | null>(initialSize);
  const [selectedColorToken, setSelectedColorToken] = useState<string | null>(
    initialColorToken,
  );

  // Find the selected variant based on size and color
  const selectedVariant = useMemo(() => {
    // Try to find by both size and color
    const byBoth = variantSummaries.find(
      (s) =>
        (selectedSize ? s.size === selectedSize : true) &&
        (selectedColorToken ? s.colorToken === selectedColorToken : true),
    );
    if (byBoth) return byBoth.variant;

    // Fallback to size only
    const bySize = selectedSize
      ? variantSummaries.find((s) => s.size === selectedSize)?.variant
      : null;
    if (bySize) return bySize;

    // Fallback to color only
    const byColor = selectedColorToken
      ? variantSummaries.find((s) => s.colorToken === selectedColorToken)
          ?.variant
      : null;
    if (byColor) return byColor;

    // Final fallback to default
    return defaultVariant;
  }, [defaultVariant, selectedColorToken, selectedSize, variantSummaries]);

  // Get display information for selected variant
  const selectedSizeLabel = extractSizeOption(selectedVariant.selectedOptions);
  const selectedColorLabel = extractColorOption(
    selectedVariant.selectedOptions,
  );
  const selectedColorHex = resolveSwatchColor(
    selectedVariant.colorHex,
    selectedColorLabel,
  );

  return {
    // Variant data
    variantSummaries,
    sizeOptions,
    colorOptions,

    // Selected state
    selectedVariant,
    selectedSize,
    selectedColorToken,
    selectedSizeLabel,
    selectedColorLabel,
    selectedColorHex,

    // State setters
    setSelectedSize,
    setSelectedColorToken,
  };
}
