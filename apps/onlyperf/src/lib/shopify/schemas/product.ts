import { z } from "zod";

/**
 * Shopify Storefront API product schemas for runtime validation
 */

// Shopify image schema (url + altText format)
export const storefrontImageSchema = z.object({
  url: z.string().url(),
  altText: z.string().nullable(),
});

// Price schema
export const priceSchema = z.object({
  amount: z.string(),
  currencyCode: z.string(),
});

// Selected option schema
export const selectedOptionSchema = z.object({
  name: z.string(),
  value: z.string(),
});

// Media image node schema (for variant images metafield)
export const mediaImageNodeSchema = z.object({
  image: storefrontImageSchema,
});

// Variant images metafield schema
export const variantImagesMetafieldSchema = z
  .object({
    references: z.object({
      nodes: z.array(mediaImageNodeSchema),
    }),
  })
  .nullable();

// Color hex metafield schema
export const colorHexMetafieldSchema = z
  .object({
    value: z.string(),
  })
  .nullable();

// Product basic info (returned with variant)
export const productBasicInfoSchema = z.object({
  id: z.string(),
  title: z.string(),
  handle: z.string(),
  description: z.string(),
});

// Full variant by ID response schema
export const variantByIdNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  availableForSale: z.boolean(),
  price: priceSchema,
  image: storefrontImageSchema.nullable(),
  selectedOptions: z.array(selectedOptionSchema),
  colorHex: colorHexMetafieldSchema,
  variantImages: variantImagesMetafieldSchema,
  product: productBasicInfoSchema,
});

// Response wrapper for node query
export const variantByIdResponseSchema = z.object({
  node: variantByIdNodeSchema.nullable(),
});

// Export inferred types
export type StorefrontImage = z.infer<typeof storefrontImageSchema>;
export type Price = z.infer<typeof priceSchema>;
export type SelectedOption = z.infer<typeof selectedOptionSchema>;
export type ProductBasicInfo = z.infer<typeof productBasicInfoSchema>;
export type VariantByIdNode = z.infer<typeof variantByIdNodeSchema>;
export type VariantByIdResponse = z.infer<typeof variantByIdResponseSchema>;

// Helper function to extract images from variant response
export function extractVariantImages(
  variant: VariantByIdNode,
): StorefrontImage[] {
  const images: StorefrontImage[] = [];

  // Add main variant image if exists
  if (variant.image) {
    images.push(variant.image);
  }

  // Add metafield images if exists
  const metafieldImages =
    variant.variantImages?.references?.nodes?.map((node) => node.image) ?? [];
  images.push(...metafieldImages);

  return images;
}
