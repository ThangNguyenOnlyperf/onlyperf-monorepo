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