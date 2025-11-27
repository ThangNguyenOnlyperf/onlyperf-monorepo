export interface DeliveryWithOrder {
  id: string;
  orderId: string;
  shipperName: string;
  shipperPhone?: string | null;
  trackingNumber?: string | null;
  status: 'waiting_for_delivery' | 'delivered' | 'failed' | 'cancelled';
  deliveredAt?: Date | null;
  failureReason?: string | null;
  failureCategory?: 'customer_unavailable' | 'wrong_address' | 'damaged_package' | 'refused_delivery' | null;
  notes?: string | null;
  confirmedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  order: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    deliveryStatus: string;
    notes?: string | null;
    customer: {
      id: string;
      name: string;
      phone: string;
      address?: string | null;
    };
    items: Array<{
      id: string;
      productName: string;
      quantity: number;
      price: number;
      qrCode: string;
    }>;
  };
  resolution?: {
    id: string;
    resolutionType: 're_import' | 'return_to_supplier' | 'retry_delivery';
    resolutionStatus: 'pending' | 'in_progress' | 'completed';
    notes?: string | null;
    scheduledDate?: Date | null;
  } | null;
}

export interface DeliveryStats {
  totalDeliveries: number;
  todayDeliveries: number;
  deliveredCount: number;
  failedCount: number;
  waitingForDeliveryCount: number;
  cancelledCount: number;
  pendingResolutionCount: number;
  totalDeliveredValue: number;
  totalFailedValue: number;
  resolutions?: {
    reImportingCount: number;
    returningCount: number;
    retryingCount: number;
    completedCount: number;
  };
}

export const DELIVERY_STATUS = {
  WAITING_FOR_DELIVERY: 'waiting_for_delivery',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export const FAILURE_CATEGORIES = {
  CUSTOMER_UNAVAILABLE: 'customer_unavailable',
  WRONG_ADDRESS: 'wrong_address',
  DAMAGED_PACKAGE: 'damaged_package',
  REFUSED_DELIVERY: 'refused_delivery',
} as const;

export const FAILURE_CATEGORY_LABELS: Record<string, string> = {
  customer_unavailable: 'Khách hàng không có mặt',
  wrong_address: 'Sai địa chỉ giao hàng',
  damaged_package: 'Hàng hóa bị hư hỏng',
  refused_delivery: 'Khách hàng từ chối nhận',
};

export const RESOLUTION_TYPES = {
  RE_IMPORT: 're_import',
  RETURN_TO_SUPPLIER: 'return_to_supplier',
  RETRY_DELIVERY: 'retry_delivery',
} as const;

export const RESOLUTION_TYPE_LABELS: Record<string, string> = {
  re_import: 'Nhập lại kho',
  return_to_supplier: 'Trả về nhà cung cấp',
  retry_delivery: 'Giao lại',
};

export const RESOLUTION_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;

export const RESOLUTION_STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý',
  in_progress: 'Đang xử lý',
  completed: 'Đã hoàn thành',
};