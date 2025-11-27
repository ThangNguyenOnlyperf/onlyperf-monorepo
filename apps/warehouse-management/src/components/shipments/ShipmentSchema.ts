import { z } from 'zod';

export const ProductLineItemSchema = z.object({
  id: z.string(),
  brand: z.string().min(1, 'Vui lòng chọn thương hiệu'),
  model: z.string().min(1, 'Vui lòng chọn model'),
  quantity: z.number().min(1, 'Số lượng phải lớn hơn 0'),
  // Pack configuration for packable products (balls)
  isPackableProduct: z.boolean().optional(),
  totalUnits: z.number().optional(), // Total raw units (e.g., 10000 balls)
  packSize: z.number().optional(), // Units per pack (e.g., 3, 6, 10)
}).refine((data) => {
  // If packable product with pack config, validate divisibility
  if (data.isPackableProduct && data.totalUnits && data.packSize) {
    return data.totalUnits % data.packSize === 0;
  }
  return true;
}, {
  message: 'Số lượng phải chia hết cho kích thước gói',
  path: ['totalUnits'],
});

export const ShipmentFormSchema = z.object({
  receiptNumber: z.string().min(1, 'Số phiếu nhập là bắt buộc'),
  receiptDate: z.string().min(1, 'Ngày nhập là bắt buộc'),
  supplierName: z.string().min(1, 'Tên nhà cung cấp là bắt buộc'),
  providerId: z.string().min(1, 'Vui lòng chọn nhà cung cấp'),
  items: z.array(ProductLineItemSchema).min(1, 'Phải có ít nhất một sản phẩm'),
});

export type ProductLineItem = z.infer<typeof ProductLineItemSchema>;
export type ShipmentFormData = z.infer<typeof ShipmentFormSchema>;