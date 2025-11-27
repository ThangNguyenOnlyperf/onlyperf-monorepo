import { z } from "zod";

// Zod schema for delivery.completed event
export const deliveryCompletedSchema = z.object({
  event: z.literal("delivery.completed"),
  data: z.object({
    deliveredAt: z.string().datetime("Invalid delivered date"),
    shopifyOrderId: z.string().nullable().optional(),
    customerId: z.string().min(1, "Customer ID is required"),
    items: z.array(
      z.object({
        qrCode: z.string().regex(/^[A-Z]{4}\d{4}$/, "Invalid QR code format"),
        warrantyMonths: z.number().int().positive().default(12),
      }),
    ),
  }),
});

// Combined schema for all warehouse sync events
export const warehouseSyncSchema = z.discriminatedUnion("event", [
  deliveryCompletedSchema,
  z.object({
    event: z.enum(["product.returned", "product.replaced"]),
    data: z.object({
      qrCode: z.string().regex(/^[A-Z]{4}\d{4}$/, "Invalid QR code format"),
    }),
  }),
]);

export type WarehouseSyncEvent = z.infer<typeof warehouseSyncSchema>;
export type DeliveryCompletedData = z.infer<typeof deliveryCompletedSchema>["data"];

export type WarehouseSyncResult =
  | { success: true; processedCount?: number; shipmentItemIds?: string[]; shipmentItemId?: string }
  | { success: false; error: string; status: number };
