import {
  findShopifyProductIdByBrandModel,
  findShopifyProductMapping,
  upsertShopifyProductMapping,
  type Database,
} from "./repository";
import type { ShopifyProductSyncResult } from "./types";
import { buildRestProductPayload, formatPrice, type ProductRecord, type ProductWithColor } from "./productPayload";
import { db } from "~/server/db";
import { getOrgShopifyConfig, createOrgShopifyClient, type OrgShopifyClient } from "./org-client";

// GraphQL mutation to set metafields on a variant
const SET_METAFIELDS_MUTATION = `
  mutation setVariantMetafields($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        key
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;

interface MetafieldsSetResponse {
  metafieldsSet: {
    metafields: Array<{ id: string; key: string; value: string }> | null;
    userErrors: Array<{ field: string[]; message: string }>;
  };
}

export interface CreateShopifyProductOptions {
  colorHex?: string | null;
}

const DEFAULT_DATABASE: Database = db;

interface RestProductVariant {
  id: number;
  sku: string;
  inventory_item_id: number | null;
}

interface RestProductResponse {
  product: {
    id: number;
    variants: RestProductVariant[];
  };
}

interface RestProductDetailOption {
  id: number;
  name: string;
  position: number;
}

interface RestProductDetailResponse {
  product: {
    id: number;
    options: RestProductDetailOption[];
  };
}

interface RestVariantCreateResponse {
  variant: RestProductVariant;
}

const COLOR_OPTION_NAME = "color";
const SIZE_OPTION_NAME = "size";
const DEFAULT_OPTION_VALUE = "Default";

/**
 * Set the color_hex metafield on a Shopify variant
 * This allows the ecommerce storefront to display the correct color swatch
 */
async function setVariantColorHexMetafield(
  client: OrgShopifyClient,
  variantGid: string,
  colorHex: string
): Promise<void> {
  try {
    const response = await client.graphqlRequest<MetafieldsSetResponse>({
      query: SET_METAFIELDS_MUTATION,
      variables: {
        metafields: [
          {
            ownerId: variantGid,
            namespace: "custom",
            key: "color_hex",
            type: "single_line_text_field",
            value: colorHex,
          },
        ],
      },
    });

    if (response.metafieldsSet.userErrors.length > 0) {
      const errorMessages = response.metafieldsSet.userErrors
        .map((e) => e.message)
        .join("; ");
      console.warn(`Warning: Failed to set color_hex metafield: ${errorMessages}`);
    }
  } catch (error) {
    // Log but don't throw - metafield is enhancement, not critical
    console.warn("Warning: Could not set color_hex metafield on variant:", error);
  }
}

export async function getShopifyProductMapping(
  productId: string,
  database: Database = DEFAULT_DATABASE
) {
  return findShopifyProductMapping(productId, database);
}

export async function createShopifyProductFromWarehouse(
  product: ProductWithColor,
  database: Database = DEFAULT_DATABASE,
  options?: CreateShopifyProductOptions
): Promise<ShopifyProductSyncResult> {
  // Get org-specific Shopify config
  const config = await getOrgShopifyConfig(product.organizationId);

  if (!config) {
    return {
      status: "skipped",
      message: "Shopify chưa được cấu hình cho tổ chức này",
    };
  }

  const client = createOrgShopifyClient(config, product.organizationId);

  const existingMapping = await findShopifyProductMapping(product.id, database);

  if (existingMapping) {
    // Even if product exists, try to set the color metafield if we have a hex value
    // This handles the case where product was created before this feature
    if (options?.colorHex && existingMapping.shopifyVariantId) {
      await setVariantColorHexMetafield(client, existingMapping.shopifyVariantId, options.colorHex);
    }

    return {
      status: "skipped",
      shopifyProductId: existingMapping.shopifyProductId,
      shopifyVariantId: existingMapping.shopifyVariantId,
      shopifyInventoryItemId: existingMapping.shopifyInventoryItemId,
      message: "Product already linked to Shopify",
    };
  }

  const existingProductGid = await findShopifyProductIdByBrandModel(
    product.brandId,
    product.model,
    database
  );

  if (existingProductGid) {
    const variantResult = await createVariantOnExistingProduct(client, existingProductGid, product);

    if (options?.colorHex) {
      await setVariantColorHexMetafield(client, variantResult.shopifyVariantId, options.colorHex);
    }

    await upsertShopifyProductMapping(
      {
        productId: product.id,
        organizationId: product.organizationId,
        shopifyProductId: variantResult.shopifyProductId,
        shopifyVariantId: variantResult.shopifyVariantId,
        shopifyInventoryItemId: variantResult.shopifyInventoryItemId,
        lastSyncedAt: new Date(),
        lastSyncStatus: "success",
        lastSyncError: null,
      },
      database
    );

    return {
      status: "success",
      shopifyProductId: variantResult.shopifyProductId,
      shopifyVariantId: variantResult.shopifyVariantId,
      shopifyInventoryItemId: variantResult.shopifyInventoryItemId,
    };
  }

  const payload = buildRestProductPayload(product);

  const data = await client.restRequest<RestProductResponse>("products.json", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!data?.product) {
    throw new Error("Shopify did not return a product after creation");
  }

  const variantNode = data.product.variants[0];

  if (!variantNode) {
    throw new Error("Shopify did not return a product variant after creation");
  }

  const shopifyProductId = toGid("Product", data.product.id);
  const shopifyVariantId = toGid("ProductVariant", variantNode.id);
  const shopifyInventoryItemId = variantNode.inventory_item_id
    ? toGid("InventoryItem", variantNode.inventory_item_id)
    : null;

  if (options?.colorHex) {
    await setVariantColorHexMetafield(client, shopifyVariantId, options.colorHex);
  }

  await upsertShopifyProductMapping(
    {
      productId: product.id,
      organizationId: product.organizationId,
      shopifyProductId,
      shopifyVariantId,
      shopifyInventoryItemId,
      lastSyncedAt: new Date(),
      lastSyncStatus: "success",
      lastSyncError: null,
    },
    database
  );

  return {
    status: "success",
    shopifyProductId,
    shopifyVariantId,
    shopifyInventoryItemId,
  };
}

async function createVariantOnExistingProduct(
  client: OrgShopifyClient,
  shopifyProductGid: string,
  product: ProductWithColor
) {
  const numericProductId = fromGid(shopifyProductGid);

  const productDetail = await client.restRequest<RestProductDetailResponse>(
    `products/${numericProductId}.json`
  );

  if (!productDetail?.product) {
    throw new Error("Không lấy được thông tin sản phẩm Shopify hiện có");
  }

  const variantPayload = buildVariantPayloadForExistingProduct(
    productDetail.product.options,
    product
  );

  const response = await client.restRequest<RestVariantCreateResponse>(
    `products/${numericProductId}/variants.json`,
    {
      method: "POST",
      body: JSON.stringify({ variant: variantPayload }),
    }
  );

  if (!response?.variant) {
    throw new Error("Shopify không trả về biến thể sau khi tạo");
  }

  return {
    shopifyProductId: shopifyProductGid,
    shopifyVariantId: toGid("ProductVariant", response.variant.id),
    shopifyInventoryItemId: response.variant.inventory_item_id
      ? toGid("InventoryItem", response.variant.inventory_item_id)
      : null,
  };
}

function buildVariantPayloadForExistingProduct(
  options: RestProductDetailOption[],
  product: ProductWithColor
) {
  const sortedOptions = [...options].sort((a, b) => a.position - b.position);
  const variant: { [key: `option${number}`]: string | undefined } & {
    sku: string;
    price: string;
    requires_shipping: boolean;
    inventory_policy: "deny" | "continue";
    inventory_management: "shopify" | null;
  } = {
    sku: product.id,
    price: formatPrice(product.price),
    requires_shipping: true,
    inventory_policy: "deny",
    inventory_management: "shopify",
  };

  const colorValue = product.colorName?.trim();
  const sizeValue = product.size?.trim();

  for (const option of sortedOptions) {
    const key = `option${option.position}` as const;
    const normalizedName = option.name.toLowerCase();

    if (normalizedName === COLOR_OPTION_NAME && colorValue) {
      variant[key] = colorValue;
    }

    if (normalizedName === SIZE_OPTION_NAME && sizeValue) {
      variant[key] = sizeValue;
    }
  }

  if (!variant.option1) {
    variant.option1 = colorValue ?? sizeValue ?? DEFAULT_OPTION_VALUE;
  }

  const hasSecondOption = sortedOptions.some((option) => option.position === 2);
  if (hasSecondOption && !variant.option2 && colorValue && sizeValue) {
    variant.option2 = variant.option1 === colorValue ? sizeValue : colorValue;
  }

  if (hasSecondOption && !variant.option2) {
    variant.option2 = DEFAULT_OPTION_VALUE;
  }

  const hasThirdOption = sortedOptions.some((option) => option.position === 3);
  if (hasThirdOption && !variant.option3) {
    variant.option3 = DEFAULT_OPTION_VALUE;
  }

  return variant;
}

function toGid(type: string, id: number | string): string {
  return `gid://shopify/${type}/${id}`;
}

function fromGid(gid: string): string {
  const parts = gid.split("/");
  return parts[parts.length - 1] ?? gid;
}
