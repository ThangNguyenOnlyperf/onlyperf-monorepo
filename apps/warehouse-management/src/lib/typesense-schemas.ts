import type { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections';

export const brandSchema: CollectionCreateSchema = {
  name: 'brands',
  enable_nested_fields: true,
  fields: [
    { name: 'id', type: 'string', index: false },
    { name: 'name', type: 'string', infix: true },
    { name: 'description', type: 'string', optional: true, infix: true },
    { name: 'created_at', type: 'int64' },
    { name: 'updated_at', type: 'int64' },
  ],
  default_sorting_field: 'created_at',
  token_separators: [' ', '-', '/', '_'],
};

export const productSchema: CollectionCreateSchema = {
  name: 'products',
  enable_nested_fields: true,
  fields: [
    { name: 'id', type: 'string', index: false },
    { name: 'name', type: 'string', infix: true },
    { name: 'brand', type: 'string', facet: true, infix: true },
    { name: 'brand_id', type: 'string', facet: true, optional: true },
    { name: 'brand_name', type: 'string', facet: true, optional: true, infix: true },
    { name: 'model', type: 'string', facet: true, infix: true },
    { name: 'category', type: 'string', facet: true, optional: true },
    { name: 'qr_code', type: 'string', optional: true, infix: true },
    { name: 'description', type: 'string', optional: true, infix: true },
    { name: 'created_at', type: 'int64' },
    { name: 'updated_at', type: 'int64' },
    { name: 'shipment_items', type: 'object[]', optional: true },
  ],
  default_sorting_field: 'created_at',
  token_separators: [' ', '-', '/', '_'],
};

// Shipment collection schema
export const shipmentSchema: CollectionCreateSchema = {
  name: 'shipments',
  enable_nested_fields: true,
  fields: [
    { name: 'id', type: 'string', index: false },
    { name: 'receipt_number', type: 'string', infix: true },
    { name: 'receipt_date', type: 'int64' },
    { name: 'supplier_name', type: 'string', facet: true, infix: true },
    { name: 'status', type: 'string', facet: true },
    { name: 'notes', type: 'string', optional: true, infix: true },
    { name: 'created_by_name', type: 'string', facet: true, optional: true },
    { name: 'created_by_id', type: 'string', optional: true },
    { name: 'created_at', type: 'int64' },
    { name: 'updated_at', type: 'int64' },
    { name: 'item_count', type: 'int32', facet: true },
    { name: 'items_received', type: 'int32' },
    { name: 'items_pending', type: 'int32' },
  ],
  default_sorting_field: 'created_at',
  token_separators: [' ', '-', '/', '_'],
};

export const shipmentItemSchema: CollectionCreateSchema = {
  name: 'shipment_items',
  enable_nested_fields: true,
  fields: [
    { name: 'id', type: 'string', index: false },
    { name: 'shipment_id', type: 'string' },
    { name: 'product_id', type: 'string' },
    { name: 'qr_code', type: 'string', infix: true },
    { name: 'status', type: 'string', facet: true },
    { name: 'storage_id', type: 'string', facet: true, optional: true },
    { name: 'scanned_at', type: 'int64', optional: true },
    { name: 'created_at', type: 'int64' },
    { name: 'product_name', type: 'string', infix: true },
    { name: 'product_brand', type: 'string', facet: true, infix: true },
    { name: 'product_model', type: 'string', facet: true, infix: true },
    { name: 'shipment_receipt_number', type: 'string', infix: true },
    { name: 'supplier_name', type: 'string', facet: true, infix: true },
    { name: 'storage_name', type: 'string', optional: true, infix: true },
  ],
  default_sorting_field: 'created_at',
  token_separators: [' ', '-', '/', '_'],
};

export const storageSchema: CollectionCreateSchema = {
  name: 'storages',
  enable_nested_fields: true,
  fields: [
    { name: 'id', type: 'string', index: false },
    { name: 'name', type: 'string', infix: true },
    { name: 'location', type: 'string', facet: true, infix: true },
    { name: 'capacity', type: 'int32', facet: true },
    { name: 'used_capacity', type: 'int32', facet: true },
    { name: 'available_capacity', type: 'int32', facet: true },
    { name: 'utilization_rate', type: 'float', facet: true },
    { name: 'priority', type: 'int32', facet: true },
    { name: 'created_by_name', type: 'string', optional: true },
    { name: 'created_by_id', type: 'string', optional: true },
    { name: 'created_at', type: 'int64' },
    { name: 'updated_at', type: 'int64' },
  ],
  default_sorting_field: 'priority',
  token_separators: [' ', '-', '/', '_'],
};

export interface BrandDocument {
  id: string;
  name: string;
  description?: string;
  created_at: number;
  updated_at: number;
}

export interface ProductDocument {
  id: string;
  name: string;
  brand: string;
  brand_id?: string;
  brand_name?: string;
  model: string;
  category?: string;
  qr_code?: string;
  description?: string;
  created_at: number;
  updated_at: number;
  shipment_items?: Array<{
    id: string;
    status: string;
    storage_name?: string;
  }>;
}

export interface ShipmentDocument {
  id: string;
  receipt_number: string;
  receipt_date: number;
  supplier_name: string;
  status: string;
  notes?: string;
  created_by_name?: string;
  created_by_id?: string;
  created_at: number;
  updated_at: number;
  item_count: number;
  items_received: number;
  items_pending: number;
}

export interface ShipmentItemDocument {
  id: string;
  shipment_id: string;
  product_id: string;
  qr_code: string;
  status: string;
  storage_id?: string;
  scanned_at?: number;
  created_at: number;
  product_name: string;
  product_brand: string;
  product_model: string;
  shipment_receipt_number: string;
  supplier_name: string;
  storage_name?: string;
}

export interface StorageDocument {
  id: string;
  name: string;
  location: string;
  capacity: number;
  used_capacity: number;
  available_capacity: number;
  utilization_rate: number;
  priority: number;
  created_by_name?: string;
  created_by_id?: string;
  created_at: number;
  updated_at: number;
}

export const COLLECTIONS = {
  BRANDS: 'brands',
  PRODUCTS: 'products',
  SHIPMENTS: 'shipments',
  SHIPMENT_ITEMS: 'shipment_items',
  STORAGES: 'storages',
} as const;

export const ALL_SCHEMAS = [
  brandSchema,
  productSchema,
  shipmentSchema,
  shipmentItemSchema,
  storageSchema,
];

export const STANDARD_SEARCH_PRESET = {
  num_typos: 1,
  typo_tokens_threshold: 2,
  drop_tokens_threshold: 2,
  split_join_tokens: 'off' as const,
  enable_typos_for_numerical_tokens: false,
  prefix: true,
  infix: 'always' as const,
};

export const COMMON_FACETS = {
  brands: 'name',
  shipments: 'status,supplier_name,created_by_name',
  products: 'brand,brand_name,model,category',
  shipment_items: 'status,product_brand,product_model,supplier_name,storage_name',
  storages: 'location,priority,utilization_rate',
};