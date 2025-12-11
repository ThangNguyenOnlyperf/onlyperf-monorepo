import { z } from 'zod';

// Role enum for type safety
export const UserRole = z.enum(['admin', 'supervisor', 'user']);
export type UserRoleType = z.infer<typeof UserRole>;

// Create user schema
export const CreateUserSchema = z.object({
  name: z.string().min(1, 'Tên là bắt buộc').trim(),
  email: z.string().email('Email không hợp lệ').trim(),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  role: UserRole.default('user'),
});
export type CreateUserData = z.infer<typeof CreateUserSchema>;

// Update role schema
export const UpdateRoleSchema = z.object({
  userId: z.string().min(1, 'userId là bắt buộc'),
  role: UserRole,
});
export type UpdateRoleData = z.infer<typeof UpdateRoleSchema>;

// Set password schema
export const SetPasswordSchema = z.object({
  userId: z.string().min(1, 'userId là bắt buộc'),
  newPassword: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  confirmPassword: z.string().min(1, 'Xác nhận mật khẩu là bắt buộc'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Mật khẩu không khớp',
  path: ['confirmPassword'],
});
export type SetPasswordData = z.infer<typeof SetPasswordSchema>;

// Delete user schema
export const DeleteUserSchema = z.object({
  userId: z.string().min(1, 'userId là bắt buộc'),
});
export type DeleteUserData = z.infer<typeof DeleteUserSchema>;

// Helper to safely parse FormData into object
export function parseFormData(formData: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === 'string') {
      obj[key] = value.trim();
    }
  });
  return obj;
}
