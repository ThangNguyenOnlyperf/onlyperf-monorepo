import { products } from "~/server/db/schema";
import { getProductTypeConfig } from "~/lib/constants/product-types";
import type { ProductAttributes } from "~/lib/schemas/productSchema";

export type ProductRecord = typeof products.$inferSelect;

// Extended type for products with JOINed color information
export type ProductWithColor = ProductRecord & {
  colorName?: string | null;
  colorHex?: string | null;
  // Ensure attributes is properly typed
  attributes?: ProductAttributes | null;
};

interface ShopifyRestVariantInput {
  sku: string;
  option1?: string;
  option2?: string;
  option3?: string;
  price: string;
  requires_shipping: boolean;
  inventory_policy: "deny" | "continue";
  inventory_management: "shopify" | null;
}

interface ShopifyRestOptionInput {
  name: string;
}

export interface ShopifyRestProductPayload {
  product: {
    title: string;
    body_html?: string;
    vendor?: string;
    product_type?: string;
    tags?: string;
    status: "active" | "draft" | "archived";
    handle?: string;
    options?: ShopifyRestOptionInput[];
    variants: ShopifyRestVariantInput[];
  };
}

export function buildRestProductPayload(product: ProductWithColor): ShopifyRestProductPayload {
  const color = product.colorName?.trim();
  // Access size from attributes JSONB
  const size = product.attributes?.size?.trim();
  const isPackProduct = product.isPackProduct ?? false;
  const packSize = product.packSize;

  const options: ShopifyRestOptionInput[] = [];
  if (color) {
    options.push({ name: "Color" });
  }
  if (size) {
    options.push({ name: "Size" });
  }

  const variant: ShopifyRestVariantInput = {
    // Use sku field if available, otherwise fall back to product id
    sku: product.sku ?? product.id,
    price: formatPrice(product.price),
    requires_shipping: true,
    inventory_policy: "deny",
    inventory_management: "shopify",
  };

  if (color) {
    variant.option1 = color;
  }

  if (size) {
    if (!variant.option1) {
      variant.option1 = size;
    } else {
      variant.option2 = size;
    }
  }

  if (!variant.option1) {
    variant.option1 = "Default";
  }

  const sanitizedHandle = product.id
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");

  // Build title - append pack size for pack products
  let title = product.name;
  if (isPackProduct && packSize) {
    title = `${product.name} (${packSize}-Pack)`;
  }


  // Build tags using config
  const typeConfig = getProductTypeConfig(product.productType);
  const tags: string[] = [...typeConfig.shopifyTags];
  if (isPackProduct && packSize) {
    tags.push("pack", `${packSize}-pack`);
  }

  return {
    product: {
      title,
      handle: sanitizedHandle || undefined,
      body_html: '',
      vendor: product.brand,
      product_type: product.category ?? undefined,
      tags: tags.length > 0 ? tags.join(", ") : undefined,
      status: "active",
      options: options.length > 0 ? options : undefined,
      variants: [variant],
    },
  };
}

export function formatPrice(rawPrice: number | null | undefined): string {
  const numeric = Number(rawPrice ?? 0);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : "0.00";
}
