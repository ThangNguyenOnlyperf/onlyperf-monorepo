import { z } from 'zod';

export const BrandSchema = z.object({
  name: z.string().min(1, 'Tên thương hiệu là bắt buộc').trim(),
  description: z.string().optional(),
});

export type BrandFormData = z.infer<typeof BrandSchema>;

export interface Brand {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}