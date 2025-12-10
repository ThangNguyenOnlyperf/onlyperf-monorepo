export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface ShipmentResult {
  shipmentId: string;
  itemCount: number;
}

export interface ProcessedItem {
  id: string;
  productId: string;
  qrCode: string;
  brand: string;
  model: string;
}

export interface GroupedQRItems {
  brand: string;
  model: string;
  items: {
    id: string;
    qrCode: string;
    status?: string;
    qrCodeDataUrl?: string;
  }[];
}

export interface GroupedQRItemsWithDataUrl {
  brand: string;
  model: string;
  items: {
    id: string;
    qrCode: string;
    qrCodeDataUrl: string;
  }[];
}

// ============================================
// Shared Relation Types
// ============================================

/** Product relation for list views (without packSize) */
export interface ProductRelation {
  id: string;
  name: string;
  brand: string;
  model: string;
}

/** Product relation with packSize for assembly views */
export interface ProductRelationWithPackSize extends ProductRelation {
  packSize: number | null;
}

/** User relation for audit fields */
export interface UserRelation {
  id: string;
  name: string;
}

/** Bundle relation for inventory items */
export interface BundleRelation {
  id: string;
  name: string;
  qrCode: string;
}

/** Storage location relation */
export interface StorageRelation {
  id: string;
  name: string;
}

/** Order relation for sold items */
export interface OrderRelation {
  id: string;
  orderNumber: string;
}

// ============================================
// Status Types
// ============================================

export type BundleStatus = 'pending' | 'assembling' | 'completed' | 'sold';
export type InventoryStatus = 'in_stock' | 'allocated' | 'sold' | 'shipped' | 'returned';
export type QRPoolStatus = 'available' | 'used';
export type InventorySourceType = 'assembly' | 'inbound' | 'return';