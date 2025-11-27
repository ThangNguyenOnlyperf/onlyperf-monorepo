/**
 * Variant sorting and processing utilities
 */

import type { StorefrontProductVariant } from "./storefront";
import {
  extractColorOption,
  extractSizeOption,
  resolveSwatchColor,
} from "./variant-utils";

export interface VariantSummary {
  variant: StorefrontProductVariant;
  size: string | null;
  color: string | null;
  swatchColor: string | null;
}

export function createVariantSummaries(
  variants: StorefrontProductVariant[],
): VariantSummary[] {
  return variants.map((variant) => {
    const size = extractSizeOption(variant.selectedOptions);
    const color = extractColorOption(variant.selectedOptions);
    const swatchColor = resolveSwatchColor(variant.colorHex, color);

    return { variant, size, color, swatchColor };
  });
}

export function sortVariantsByOptions(
  summaries: VariantSummary[],
): VariantSummary[] {
  return [...summaries].sort((a, b) => {
    const sizeComparison = (a.size ?? "").localeCompare(
      b.size ?? "",
      undefined,
      {
        numeric: true,
        sensitivity: "base",
      },
    );

    if (sizeComparison !== 0) return sizeComparison;

    return (a.color ?? "").localeCompare(b.color ?? "", undefined, {
      sensitivity: "base",
    });
  });
}
