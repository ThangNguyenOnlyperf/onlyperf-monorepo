export interface CartItem {
  id: string; // shipmentItemId
  productId: string;
  productName: string;
  brand: string;
  model: string;
  qrCode: string;
  price: number;
  shipmentItemId: string;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  address: string;
  paymentMethod: 'cash' | 'bank_transfer';
  voucherCode: string;
  customerType: 'b2b' | 'b2c';
  providerId?: string; // For B2B customers
}

export interface OrderData {
  cartItems: CartItem[];
  customerInfo: CustomerInfo;
  totalAmount: number;
}

export interface ScannedProduct {
  shipmentItemId: string;
  productId: string;
  productName: string;
  brand: string;
  model: string;
  qrCode: string;
  price: number;
  status: string;
  storageId: string | null;
}