import { storefrontQuery } from "./client";
import {
  mapProductConnection,
  type ProductConnection,
  type ProductNode,
  toStorefrontProduct,
  toStorefrontProductDetail,
} from "./mappers/product";
import {
  PRODUCT_BY_HANDLE_QUERY,
  PRODUCT_RECOMMENDATIONS_QUERY,
  PRODUCTS_QUERY,
  VARIANT_BY_ID_QUERY,
} from "./queries/products";
import type {
  ProductFilterOption,
  ProductListingOptions,
  ProductListingResult,
  StorefrontProduct,
  StorefrontProductDetail,
} from "./types";
import {
  extractColorOption,
  extractSizeOption,
  normalizeToken,
  resolveSwatchColor,
} from "./variant-utils";
import {
  type VariantByIdResponse,
  type VariantByIdNode,
  variantByIdResponseSchema,
  extractVariantImages,
} from "./schemas/product";
import type { StorefrontProductImage } from "./types";
import { Locale } from "./locale";

interface ProductsQueryResult {
  products: ProductConnection;
}

interface ProductByHandleQueryResult {
  product: ProductNode | null;
}

interface ProductRecommendationsQueryResult {
  productRecommendations: ProductNode[];
}

export async function getProducts(
  first = 8,
  locale?: Locale,
): Promise<StorefrontProduct[]> {
  const data = await storefrontQuery<ProductsQueryResult>(PRODUCTS_QUERY, {
    variables: { first },
    locale,
  });

  return mapProductConnection(data.products);
}

export async function getProductByHandle(
  handle: string,
  locale?: Locale,
): Promise<StorefrontProductDetail | null> {
  const normalizedHandle = handle.trim();

  if (!normalizedHandle) {
    throw new Error("Product handle is required to fetch product details.");
  }

  const data = await storefrontQuery<ProductByHandleQueryResult>(
    PRODUCT_BY_HANDLE_QUERY,
    {
      variables: { handle: normalizedHandle },
      locale,
    },
  );
  if (!data.product) {
    return null;
  }

  const result = toStorefrontProductDetail(data.product);
  return result;
}

/**
 * Fetch a product variant by its Shopify GID
 * @param variantId - Shopify variant GID (e.g., "gid://shopify/ProductVariant/123")
 * @returns Variant data with images and product info, or null if not found
 * @throws Error if variant data is invalid
 */
export async function getVariantById(variantId: string): Promise<{
  variant: VariantByIdNode;
  images: StorefrontProductImage[];
} | null> {
  const trimmedId = variantId.trim();

  if (!trimmedId) {
    throw new Error("Variant ID is required to fetch variant details.");
  }

  // Fetch variant data from Shopify
  const data = await storefrontQuery<VariantByIdResponse>(VARIANT_BY_ID_QUERY, {
    variables: { id: trimmedId },
  });

  // Validate response with Zod
  const validated = variantByIdResponseSchema.parse(data);

  if (!validated.node) {
    return null;
  }

  // Extract images from variant
  const images = extractVariantImages(validated.node);

  return {
    variant: validated.node,
    images,
  };
}

export async function getProductRecommendations(
  productId: string,
  limit = 4,
  locale?: Locale,
): Promise<StorefrontProduct[]> {
  const trimmed = productId.trim();

  if (!trimmed) {
    return [];
  }

  const data = await storefrontQuery<ProductRecommendationsQueryResult>(
    PRODUCT_RECOMMENDATIONS_QUERY,
    {
      variables: { productId: trimmed },
      locale,
    },
  );

  return data.productRecommendations
    .map((node) => toStorefrontProduct(node))
    .filter((product): product is StorefrontProduct => Boolean(product))
    .slice(0, Math.max(0, limit));
}

interface FilterMaps {
  colorMap: Map<
    string,
    { label: string; swatchColor?: string | null; productIds: Set<string> }
  >;
  sizeMap: Map<string, { label: string; productIds: Set<string> }>;
}

function buildFilterMaps(products: StorefrontProduct[]): FilterMaps {
  const colorMap = new Map<
    string,
    { label: string; swatchColor?: string | null; productIds: Set<string> }
  >();
  const sizeMap = new Map<string, { label: string; productIds: Set<string> }>();

  for (const product of products) {
    for (const variant of product.variants) {
      const colorName = extractColorOption(variant.selectedOptions);

      if (colorName) {
        const colorToken = normalizeToken(colorName);
        const swatchColor = resolveSwatchColor(variant.colorHex, colorName);
        const existing = colorMap.get(colorToken) ?? {
          label: colorName,
          swatchColor,
          productIds: new Set<string>(),
        };

        if (!existing.swatchColor && swatchColor) {
          existing.swatchColor = swatchColor;
        }

        existing.productIds.add(product.id);
        colorMap.set(colorToken, existing);
      }

      const sizeValue = extractSizeOption(variant.selectedOptions);
      if (sizeValue) {
        const sizeToken = normalizeToken(sizeValue);
        const existing = sizeMap.get(sizeToken) ?? {
          label: sizeValue,
          productIds: new Set<string>(),
        };

        existing.productIds.add(product.id);
        sizeMap.set(sizeToken, existing);
      }
    }
  }

  return { colorMap, sizeMap };
}

interface NormalizeFiltersArgs {
  values?: string[];
}

function normalizeFilterTokens({ values }: NormalizeFiltersArgs): Set<string> {
  return new Set(
    (values ?? [])
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value))
      .map((value) => normalizeToken(value)),
  );
}

function buildFilterOptions(
  entries: Array<
    [
      string,
      { label: string; swatchColor?: string | null; productIds: Set<string> },
    ]
  >,
  activeTokens: Set<string>,
  includeSwatch = false,
): ProductFilterOption[] {
  return entries
    .sort((a, b) =>
      a[1].label.localeCompare(b[1].label, undefined, { sensitivity: "base" }),
    )
    .map(([token, entry]) => ({
      token,
      label: entry.label,
      count: entry.productIds.size,
      isActive: activeTokens.has(token),
      ...(includeSwatch ? { swatchColor: entry.swatchColor ?? null } : {}),
    }));
}

export async function getProductListing(
  options: ProductListingOptions = {},
): Promise<ProductListingResult> {
  const pageSize = Math.max(1, Math.min(options.pageSize ?? 12, 60));
  const requestedPage = Math.max(1, options.page ?? 1);
  const maxProducts = Math.max(20, Math.min(options.maxProducts ?? 250, 250));

  const colorTokens = normalizeFilterTokens({ values: options.colorFilters });
  const sizeTokens = normalizeFilterTokens({ values: options.sizeFilters });

  const allProducts = await getProducts(maxProducts, options.locale);
  const { colorMap, sizeMap } = buildFilterMaps(allProducts);

  const filteredProducts = allProducts.filter((product) =>
    product.variants.some((variant) => {
      const colorName = extractColorOption(variant.selectedOptions);
      const sizeValue = extractSizeOption(variant.selectedOptions);

      const colorToken = colorName ? normalizeToken(colorName) : null;
      const sizeToken = sizeValue ? normalizeToken(sizeValue) : null;

      const matchesColor =
        colorTokens.size === 0 || (colorToken && colorTokens.has(colorToken));
      const matchesSize =
        sizeTokens.size === 0 || (sizeToken && sizeTokens.has(sizeToken));

      return matchesColor && matchesSize;
    }),
  );

  const total = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const startIndex = (page - 1) * pageSize;
  const items = filteredProducts.slice(startIndex, startIndex + pageSize);

  const colorFilters = buildFilterOptions(
    Array.from(colorMap.entries()),
    colorTokens,
    true,
  );
  const sizeFilters = buildFilterOptions(
    Array.from(sizeMap.entries()),
    sizeTokens,
  );

  return {
    items,
    total,
    page,
    totalPages,
    pageSize,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    filters: {
      colors: colorFilters,
      sizes: sizeFilters,
    },
  };
}
