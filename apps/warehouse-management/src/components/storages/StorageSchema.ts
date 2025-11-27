import { z } from 'zod';

export const StorageSchema = z.object({
  name: z.string().min(1, 'Tên kho là bắt buộc').max(100, 'Tên kho tối đa 100 ký tự'),
  location: z.string().min(1, 'Vị trí là bắt buộc').max(200, 'Vị trí tối đa 200 ký tự'),
  capacity: z.number()
    .min(1, 'Sức chứa phải lớn hơn 0')
    .max(999999, 'Sức chứa quá lớn'),
  priority: z.number()
    .min(0, 'Độ ưu tiên tối thiểu là 0')
    .max(100, 'Độ ưu tiên tối đa là 100'),
});

export type StorageFormData = z.infer<typeof StorageSchema>;