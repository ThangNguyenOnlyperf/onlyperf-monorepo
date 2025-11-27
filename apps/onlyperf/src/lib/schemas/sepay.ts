import { z } from "zod";

export const sepayWebhookSchema = z.object({
  id: z.number(),
  gateway: z.string(),
  transactionDate: z.string(),
  accountNumber: z.string().optional().nullable(),
  subAccount: z.string().optional().nullable(),
  code: z.string().optional().nullable(),
  content: z.string(),
  transferType: z.enum(["in", "out"]),
  transferAmount: z.number(),
  accumulated: z.number(),
  referenceCode: z.string(),
  description: z.string().optional().default(""),
});

export type SepayWebhookData = z.infer<typeof sepayWebhookSchema>;
