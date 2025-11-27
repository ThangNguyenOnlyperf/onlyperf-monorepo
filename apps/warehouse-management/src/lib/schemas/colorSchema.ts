import { z } from 'zod';

export const ColorSchema = z.object({
  name: z.string().min(1, 'Tên màu là bắt buộc').trim(),
  hex: z
    .string()
    .regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/, 'Mã màu không hợp lệ (VD: #FF0000)')
    .transform((s) => s.toUpperCase()),
});

export type ColorFormData = z.infer<typeof ColorSchema>;

export interface Color {
  id: string;
  name: string;
  hex: string;
  createdAt: Date;
  updatedAt: Date;
}

