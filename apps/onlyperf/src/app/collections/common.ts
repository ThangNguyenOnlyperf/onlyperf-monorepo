import type { CatalogSortHandle } from "@/lib/shopify/storefront";

const SORT_VALUES: CatalogSortHandle[] = [
  "recommended",
  "price-asc",
  "price-desc",
  "newest",
];

export const DEFAULT_SORT: CatalogSortHandle = "recommended";

export function parseSortParam(
  value: string | string[] | undefined,
): CatalogSortHandle {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && SORT_VALUES.includes(raw as CatalogSortHandle)) {
    return raw as CatalogSortHandle;
  }
  return DEFAULT_SORT;
}
