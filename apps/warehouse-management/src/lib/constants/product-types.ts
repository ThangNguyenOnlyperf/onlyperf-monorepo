/**
 * Centralized Product Type Configuration
 *
 * This file defines all product types and their behavior across the application.
 * Adding a new product type is as simple as adding a new entry to PRODUCT_TYPE_CONFIGS.
 */

export const PRODUCT_TYPES = {
  GENERAL: 'general',
  INDIVIDUAL: 'individual',
  BALL: 'ball',
} as const;

export type ProductTypeValue = (typeof PRODUCT_TYPES)[keyof typeof PRODUCT_TYPES];

export interface ProductTypeConfig {
  value: ProductTypeValue;
  label: string;
  description: string;
  icon: 'Box' | 'Layers' | 'Package';
  colorClass: string;
  features: {
    /** Show handleLength and handleCircumference fields in product creation */
    showHandleFields: boolean;
    /** Show pack configuration (totalUnits, packSize) in shipment form */
    showPackConfig: boolean;
  };
  shopifyTags: string[];
}

export const PRODUCT_TYPE_CONFIGS: Record<ProductTypeValue, ProductTypeConfig> = {
  general: {
    value: 'general',
    label: 'Chung',
    description: 'Sản phẩm thông thường (túi, phụ kiện, dây đeo...)',
    icon: 'Box',
    colorClass: 'slate',
    features: {
      showHandleFields: false,
      showPackConfig: false,
    },
    shopifyTags: ['general'],
  },
  individual: {
    value: 'individual',
    label: 'Vợt',
    description: 'Vợt pickleball - có thông tin chiều dài/chu vi cán',
    icon: 'Package',
    colorClass: 'primary',
    features: {
      showHandleFields: true,
      showPackConfig: false,
    },
    shopifyTags: ['individual', 'paddle'],
  },
  ball: {
    value: 'ball',
    label: 'Bóng (đóng gói)',
    description: 'Sản phẩm có thể đóng gói (3 bóng/gói, 10 bóng/gói)',
    icon: 'Layers',
    colorClass: 'cyan',
    features: {
      showHandleFields: false,
      showPackConfig: true,
    },
    shopifyTags: ['ball', 'balls'],
  },
};

/**
 * Get configuration for a product type
 * Falls back to 'general' config if type is unknown
 */
export const getProductTypeConfig = (type: string | undefined | null): ProductTypeConfig =>
  PRODUCT_TYPE_CONFIGS[type as ProductTypeValue] ?? PRODUCT_TYPE_CONFIGS.general;

/**
 * Check if a product type supports pack configuration in shipments
 */
export const isPackableType = (type: string | undefined | null): boolean =>
  getProductTypeConfig(type).features.showPackConfig;

/**
 * Check if a product type should show paddle-specific handle fields
 */
export const showsHandleFields = (type: string | undefined | null): boolean =>
  getProductTypeConfig(type).features.showHandleFields;

/**
 * Get all product type values as an array (for Zod enum)
 */
export const PRODUCT_TYPE_VALUES = Object.values(PRODUCT_TYPES) as [ProductTypeValue, ...ProductTypeValue[]];

/**
 * Default product type for new products
 */
export const DEFAULT_PRODUCT_TYPE: ProductTypeValue = 'general';
