"use server";

import { cookies } from "next/headers";
import { auth } from "~/lib/auth";
import { db } from "~/server/db";
import { user, shipments, orders, deliveries, deliveryHistory, member } from "~/server/db/schema";
import { count, eq } from "drizzle-orm";
import type { ActionResult } from "./types";
import { signUpEmailServer } from "~/lib/auth-server";
import { revalidatePath } from "next/cache";
import { logger, getUserContext } from "~/lib/logger";
import {
  CreateUserSchema,
  UpdateRoleSchema,
  SetPasswordSchema,
  DeleteUserSchema,
  parseFormData,
} from "~/lib/schemas/userSchema";

export async function createUserAction(formData: FormData): Promise<ActionResult> {
  try {
    const rawData = parseFormData(formData);
    const parsed = CreateUserSchema.safeParse(rawData);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ";
      logger.warn({ errors: parsed.error.errors }, "User creation failed: Validation error");
      return { success: false, error: firstError };
    }

    const { name, email, password, role } = parsed.data;

    // RBAC: only admin can create users
    const hdrs = new Headers();
    const cs = await cookies();
    const cookieStr = cs.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
    if (cookieStr) hdrs.set("cookie", cookieStr);
    const session = await auth.api.getSession({ headers: hdrs });
    const userContext = getUserContext(session);

    if (session?.user?.role !== "admin") {
      logger.warn({ ...userContext, targetEmail: email }, "User creation denied: Unauthorized access attempt");
      return { success: false, error: "Không có quyền thực hiện" };
    }

    logger.info({ ...userContext, targetEmail: email, targetName: name, targetRole: role }, "Attempting to create new user");

    const result = await signUpEmailServer({ email, password, name });
    if (!result.ok) {
      const errorBody = result.body as { code?: string; message?: string } | null;
      const code = errorBody?.code?.toUpperCase() ?? "";
      let message = String(result.error);
      if (code === "USER_ALREADY_EXISTS" || /already exists/i.test(message)) {
        message = "Email đã tồn tại";
      } else if (code === "INVALID_EMAIL" || /invalid email/i.test(message)) {
        message = "Email không hợp lệ";
      } else if (code === "WEAK_PASSWORD" || /password/i.test(message)) {
        message = "Mật khẩu không hợp lệ";
      }
      logger.error({ ...userContext, targetEmail: email, code, errorMessage: message }, "User creation failed");
      return { success: false, error: message };
    }

    // Update user role
    await db.update(user).set({ role }).where(eq(user.email, email));

    // Add user to the same organization as the admin
    const sessionData = session.session as { activeOrganizationId?: string } | undefined;
    const activeOrgId = sessionData?.activeOrganizationId;
    const successBody = result.user as { id: string } | null;
    const newUserId = successBody?.id;

    if (activeOrgId && newUserId) {
      // Map app role to org role: admin → admin, user → member
      const orgRole = role === "admin" ? "admin" : "member";

      const memberId = `mbr_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
      await db.insert(member).values({
        id: memberId,
        userId: newUserId,
        organizationId: activeOrgId,
        role: orgRole,
        createdAt: new Date(),
      });

      logger.info({
        ...userContext,
        targetUserId: newUserId,
        targetEmail: email,
        organizationId: activeOrgId,
        orgRole,
      }, `Added user to organization with role ${orgRole}`);
    }

    logger.info({ ...userContext, targetEmail: email, targetName: name, targetRole: role }, `User ${userContext.userName} created new user ${name} (${email}) with role ${role}`);
    revalidatePath("/admin/users");
    return { success: true, message: "Tạo tài khoản thành công" };
  } catch (e) {
    logger.error({ error: e }, "Unexpected error during user creation");
    return { success: false, error: "Có lỗi xảy ra khi tạo tài khoản" };
  }
}

export async function updateUserRoleAction(formData: FormData): Promise<ActionResult> {
  try {
    const rawData = parseFormData(formData);
    const parsed = UpdateRoleSchema.safeParse(rawData);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ";
      logger.warn({ errors: parsed.error.errors }, "Role update failed: Validation error");
      return { success: false, error: firstError };
    }

    const { userId, role } = parsed.data;

    // RBAC: only admin can update roles
    const hdrs = new Headers();
    const cs = await cookies();
    const cookieStr = cs.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
    if (cookieStr) hdrs.set("cookie", cookieStr);
    const session = await auth.api.getSession({ headers: hdrs });
    const userContext = getUserContext(session);

    if (session?.user?.role !== "admin") {
      logger.warn({ ...userContext, targetUserId: userId, newRole: role }, "Role update denied: Unauthorized access attempt");
      return { success: false, error: "Không có quyền thực hiện" };
    }

    // Get current user info before update
    const [targetUser] = await db.select({ email: user.email, name: user.name, role: user.role }).from(user).where(eq(user.id, userId));

    logger.info({ ...userContext, targetUserId: userId, targetEmail: targetUser?.email, oldRole: targetUser?.role, newRole: role }, "Attempting to update user role");

    await db.update(user).set({ role }).where(eq(user.id, userId));

    logger.info({ ...userContext, targetUserId: userId, targetEmail: targetUser?.email, oldRole: targetUser?.role, newRole: role }, `User ${userContext.userName} updated role of ${targetUser?.name ?? targetUser?.email} from ${targetUser?.role} to ${role}`);
    revalidatePath("/admin/users");
    return { success: true, message: "Cập nhật vai trò thành công" };
  } catch (e) {
    logger.error({ error: e }, "Unexpected error during role update");
    return { success: false, error: "Có lỗi xảy ra khi cập nhật vai trò" };
  }
}

// Wrappers for useActionState in client components
export async function createUserActionState(
  _prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  return createUserAction(formData);
}

export async function updateUserRoleActionState(
  _prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  return updateUserRoleAction(formData);
}

export async function setUserPasswordAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const rawData = parseFormData(formData);
    const parsed = SetPasswordSchema.safeParse(rawData);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ";
      logger.warn({ errors: parsed.error.errors }, "Password reset failed: Validation error");
      return { success: false, error: firstError };
    }

    const { userId, newPassword } = parsed.data;

    // RBAC: only admin can set user password
    const hdrs = new Headers();
    const cs = await cookies();
    const cookieStr = cs.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
    if (cookieStr) hdrs.set("cookie", cookieStr);
    const session = await auth.api.getSession({ headers: hdrs });
    const userContext = getUserContext(session);

    if (session?.user?.role !== "admin") {
      logger.warn({ ...userContext, targetUserId: userId }, "Password reset denied: Unauthorized access attempt");
      return { success: false, error: "Không có quyền thực hiện" };
    }

    // Get target user info
    const [targetUser] = await db.select({ email: user.email, name: user.name }).from(user).where(eq(user.id, userId));

    logger.info({ ...userContext, targetUserId: userId, targetEmail: targetUser?.email }, "Attempting to reset user password");

    // Call Better Auth admin endpoint to set user password
    const res = await auth.api.setUserPassword({
      asResponse: true,
      headers: hdrs,
      body: { userId, newPassword },
    });
    let body: { message?: string } | null = null;
    try { body = await res.json() as { message?: string }; } catch { /* empty */ }
    if (!res.ok) {
      const msg = body?.message ?? "Không thể đặt lại mật khẩu";
      logger.error({ ...userContext, targetUserId: userId, targetEmail: targetUser?.email, errorMessage: msg }, "Password reset failed");
      return { success: false, error: msg };
    }

    logger.info({ ...userContext, targetUserId: userId, targetEmail: targetUser?.email }, `User ${userContext.userName} reset password for ${targetUser?.name ?? targetUser?.email}`);
    revalidatePath("/admin/users");
    return { success: true, message: "Đã đổi mật khẩu người dùng" };
  } catch (e) {
    logger.error({ error: e }, "Unexpected error during password reset");
    return { success: false, error: "Có lỗi xảy ra khi đổi mật khẩu" };
  }
}

export async function setUserPasswordActionState(
  _prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  return setUserPasswordAction(formData);
}

export async function deleteUserAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    // Parse and validate with Zod
    const rawData = parseFormData(formData);
    const parsed = DeleteUserSchema.safeParse(rawData);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ";
      logger.warn({ errors: parsed.error.errors }, "User deletion failed: Validation error");
      return { success: false, error: firstError };
    }

    const { userId: targetUserId } = parsed.data;

    const hdrs = new Headers();
    const cs = await cookies();
    const cookieStr = cs.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
    if (cookieStr) hdrs.set("cookie", cookieStr);
    const session = await auth.api.getSession({ headers: hdrs });
    const userContext = getUserContext(session);

    if (session?.user?.role !== "admin") {
      logger.warn({ ...userContext, targetUserId }, "User deletion denied: Unauthorized access attempt");
      return { success: false, error: "Không có quyền thực hiện" };
    }
    if (session.user.id === targetUserId) {
      logger.warn({ ...userContext, targetUserId }, "User deletion denied: Attempted self-deletion");
      return { success: false, error: "Không thể tự xóa tài khoản của chính bạn" };
    }

    // Get target user info before deletion
    const [targetUser] = await db.select({ email: user.email, name: user.name }).from(user).where(eq(user.id, targetUserId));

    logger.info({ ...userContext, targetUserId, targetEmail: targetUser?.email }, "Checking related records before user deletion");

    // Check related records to avoid cascading domain data
    const [shipmentCnt, orderCnt, deliveryCnt, historyCnt] = await Promise.all([
      db.select({ c: count() }).from(shipments).where(eq(shipments.createdBy, targetUserId)),
      db.select({ c: count() }).from(orders).where(eq(orders.processedBy, targetUserId)),
      db.select({ c: count() }).from(deliveries).where(eq(deliveries.confirmedBy, targetUserId)),
      db.select({ c: count() }).from(deliveryHistory).where(eq(deliveryHistory.changedBy, targetUserId)),
    ]);
    const related = (shipmentCnt?.[0]?.c ?? 0) + (orderCnt?.[0]?.c ?? 0) + (deliveryCnt?.[0]?.c ?? 0) + (historyCnt?.[0]?.c ?? 0);
    if (related > 0) {
      logger.warn({ ...userContext, targetUserId, targetEmail: targetUser?.email, relatedRecords: related, shipments: shipmentCnt?.[0]?.c, orders: orderCnt?.[0]?.c, deliveries: deliveryCnt?.[0]?.c, history: historyCnt?.[0]?.c }, "User deletion denied: Related records exist");
      return { success: false, error: "Không thể xóa vì tài khoản có dữ liệu liên quan" };
    }

    logger.info({ ...userContext, targetUserId, targetEmail: targetUser?.email }, "Attempting to delete user");

    const res = await auth.api.removeUser({
      asResponse: true,
      headers: hdrs,
      body: { userId: targetUserId },
    });
    let body: { message?: string } | null = null;
    try { body = await res.json() as { message?: string }; } catch { /* empty */ }
    if (!res.ok) {
      const msg = body?.message ?? "Xóa người dùng thất bại";
      logger.error({ ...userContext, targetUserId, targetEmail: targetUser?.email, errorMessage: msg }, "User deletion failed");
      return { success: false, error: msg };
    }

    logger.info({ ...userContext, targetUserId, targetEmail: targetUser?.email }, `User ${userContext.userName} deleted user ${targetUser?.name ?? targetUser?.email} (${targetUser?.email})`);
    revalidatePath("/admin/users");
    return { success: true, message: "Đã xóa người dùng" };
  } catch (e) {
    logger.error({ error: e }, "Unexpected error during user deletion");
    return { success: false, error: "Có lỗi xảy ra khi xóa người dùng" };
  }
}

export async function deleteUserActionState(
  _prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  return deleteUserAction(formData);
}
