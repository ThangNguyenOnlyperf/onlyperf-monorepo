import { z } from 'zod';

export const updateDeliveryStatusSchema = z.object({
  status: z.enum(['delivered', 'failed']),
  failureReason: z.string().optional(),
  failureCategory: z.enum(['customer_unavailable', 'wrong_address', 'damaged_package', 'refused_delivery']).optional(),
  notes: z.string().optional(),
});

export const failureResolutionSchema = z.object({
  resolutionType: z.enum(['re_import', 'return_to_supplier', 'retry_delivery']),
  notes: z.string().optional(),
  scheduledDate: z.string().optional(),
  targetStorageId: z.string().optional(),
  supplierReturnReason: z.string().optional(),
});

export const createDeliverySchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  shipperName: z.string().min(1, "Shipper name is required"),
  shipperPhone: z.string().optional(),
  trackingNumber: z.string().optional(),
});

export type UpdateDeliveryStatusData = z.infer<typeof updateDeliveryStatusSchema>;
export type FailureResolutionData = z.infer<typeof failureResolutionSchema>;
export type CreateDeliveryData = z.infer<typeof createDeliverySchema>;