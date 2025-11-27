import { z } from "zod";

// Zod schema for transfer request
export const transferOwnershipSchema = z.object({
  qrCode: z.string().regex(/^[A-Z]{4}\d{4}$/, "Invalid QR code format"),
  newOwnerEmail: z.string().email("Invalid email format"),
});

export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;

export type TransferOwnershipResult =
  | { success: true; transferId: string; message: string }
  | { success: false; error: string; status: number };
