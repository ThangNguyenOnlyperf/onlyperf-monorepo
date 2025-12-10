import { z } from 'zod';
import {
  PRODUCT_TYPES,
  DEFAULT_PRODUCT_TYPE,
  type ProductTypeValue,
} from '~/lib/constants/product-types';

// Re-export for backward compatibility
export const ProductType = PRODUCT_TYPES;
export type { ProductTypeValue };

// Product attributes schema for JSONB field
export const ProductAttributesSchema = z.object({
  colorId: z.string().min(1, 'Màu sắc là bắt buộc'),
  weight: z.string().optional(),
  size: z.string().optional(),
  thickness: z.string().optional(),
  material: z.string().optional(),
  handleLength: z.string().optional(),
  handleCircumference: z.string().optional(),
});

export type ProductAttributesFormData = z.infer<typeof ProductAttributesSchema>;

export const ProductSchema = z.object({
  brandId: z.string().min(1, 'Thương hiệu là bắt buộc'),
  model: z.string().min(1, 'Model là bắt buộc').trim(),
  sku: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  // Dynamic product attributes as nested object
  attributes: ProductAttributesSchema,
  // Product type fields for pack support
  productType: z.enum(['general', 'individual', 'ball']).default(DEFAULT_PRODUCT_TYPE),
  isPackProduct: z.boolean().optional(),
  packSize: z.number().int().positive().optional().nullable(),
  baseProductId: z.string().optional().nullable(),
});

// Schema for creating a pack product from a base product
export const PackProductSchema = z.object({
  baseProductId: z.string().min(1, 'Sản phẩm gốc là bắt buộc'),
  packSize: z.number().int().min(2, 'Số lượng mỗi gói phải từ 2 trở lên'),
  price: z.number().int().min(0, 'Giá không được âm').optional(),
});

// Use z.input for form data (allows optional fields before defaults are applied)
export type ProductFormData = z.input<typeof ProductSchema>;

// Product attributes interface (matches JSONB structure)
export interface ProductAttributes {
  colorId?: string;
  weight?: string;
  size?: string;
  thickness?: string;
  material?: string;
  handleLength?: string;
  handleCircumference?: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  brandId: string | null;
  brandName?: string;
  model: string;
  sku: string | null;
  qrCode: string | null;
  description: string | null;
  category: string | null;
  // Dynamic product attributes stored as JSONB
  attributes: ProductAttributes | null;
  // Computed from JOIN with colors table (based on attributes.colorId)
  colorName?: string | null;
  colorHex?: string | null;
  // Product type fields for pack support
  productType: string; // Expected: 'general' | 'individual' | 'ball' - use string for DB compatibility
  isPackProduct: boolean;
  packSize: number | null;
  baseProductId: string | null;
  // Computed: base product info (for pack products)
  baseProductName?: string;
  // Computed: pack products (for base products)
  packProducts?: Product[];
  createdAt: Date;
  updatedAt: Date;
  totalQuantity?: number;
  availableQuantity?: number;
  shopifyProductId?: string | null;
  shopifyVariantId?: string | null;
  shopifyInventoryItemId?: string | null;
  shopifyLastSyncedAt?: Date | null;
  shopifyLastSyncStatus?: string | null;
  shopifyLastSyncError?: string | null;
}

export type PackProductFormData = z.infer<typeof PackProductSchema>;

export interface ProductMetrics {
  totalProducts: number;
  totalItems: number;
  availableItems: number;
  soldItems: number;
}
