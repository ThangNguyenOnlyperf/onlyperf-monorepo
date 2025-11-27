"use server";

import { cookies } from "next/headers";
import { auth } from "~/lib/auth";
import { db } from "~/server/db";
import { user, shipments, orders, deliveries, deliveryHistory } from "~/server/db/schema";
import { count, eq } from "drizzle-orm";
import type { ActionResult } from "./types";
import { signUpEmailServer } from "~/lib/auth-server";
import { revalidatePath } from "next/cache";
import { logger, getUserContext } from "~/lib/logger";

export async function createUserAction(formData: FormData): Promise<ActionResult> {
  try {
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "").trim();
    const role = String(formData.get("role") || "user").trim();

    if (!name || !email || !password) {
      logger.warn({ name: !!name, email: !!email, password: !!password }, "User creation failed: Missing required fields");
      return { success: false, error: "Thiếu thông tin bắt buộc" };
    }

    // RBAC: only admin can create users
    const hdrs = new Headers();
    const cs = await cookies();
    const cookieStr = cs.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
    if (cookieStr) hdrs.set("cookie", cookieStr);
    const session = await auth.api.getSession({ headers: hdrs });
    const userContext = getUserContext(session);

    if (!session?.user || session.user.role !== "admin") {
      logger.warn({ ...userContext, targetEmail: email }, "User creation denied: Unauthorized access attempt");
      return { success: false, error: "Không có quyền thực hiện" };
    }

    logger.info({ ...userContext, targetEmail: email, targetName: name, targetRole: role }, "Attempting to create new user");

    const result = await signUpEmailServer({ email, password, name });
    if (!result.ok) {
      const rawCode = (result as any)?.body?.code as string | undefined;
      const code = rawCode?.toUpperCase();
      let message = result.error || "Tạo tài khoản thất bại";
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

    if (role === "admin" || role === "user") {
      await db.update(user).set({ role }).where(eq(user.email, email));
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
    const userId = String(formData.get("userId") || "").trim();
    const role = String(formData.get("role") || "").trim();
    if (!userId || (role !== "admin" && role !== "user")) {
      logger.warn({ userId, role }, "Role update failed: Invalid request parameters");
      return { success: false, error: "Yêu cầu không hợp lệ" };
    }

    // RBAC: only admin can update roles
    const hdrs = new Headers();
    const cs = await cookies();
    const cookieStr = cs.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
    if (cookieStr) hdrs.set("cookie", cookieStr);
    const session = await auth.api.getSession({ headers: hdrs });
    const userContext = getUserContext(session);

    if (!session?.user || session.user.role !== "admin") {
      logger.warn({ ...userContext, targetUserId: userId, newRole: role }, "Role update denied: Unauthorized access attempt");
      return { success: false, error: "Không có quyền thực hiện" };
    }

    // Get current user info before update
    const [targetUser] = await db.select({ email: user.email, name: user.name, role: user.role }).from(user).where(eq(user.id, userId));

    logger.info({ ...userContext, targetUserId: userId, targetEmail: targetUser?.email, oldRole: targetUser?.role, newRole: role }, "Attempting to update user role");

    await db.update(user).set({ role }).where(eq(user.id, userId));

    logger.info({ ...userContext, targetUserId: userId, targetEmail: targetUser?.email, oldRole: targetUser?.role, newRole: role }, `User ${userContext.userName} updated role of ${targetUser?.name || targetUser?.email} from ${targetUser?.role} to ${role}`);
    revalidatePath("/admin/users");
    return { success: true, message: "Cập nhật vai trò thành công" };
  } catch (e) {
    logger.error({ error: e }, "Unexpected error during role update");
    return { success: false, error: "Có lỗi xảy ra khi cập nhật vai trò" };
  }
}

// Wrappers for useActionState in client components
export async function createUserActionState(
  prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  return createUserAction(formData);
}

export async function updateUserRoleActionState(
  prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  return updateUserRoleAction(formData);
}

export async function setUserPasswordAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const userId = String(formData.get("userId") || "");
    const newPassword = String(formData.get("newPassword") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");
    if (!userId || !newPassword || !confirmPassword) {
      logger.warn({ userId: !!userId, hasPassword: !!newPassword, hasConfirm: !!confirmPassword }, "Password reset failed: Missing required fields");
      return { success: false, error: "Thiếu thông tin bắt buộc" };
    }
    if (newPassword !== confirmPassword) {
      logger.warn({ userId }, "Password reset failed: Password mismatch");
      return { success: false, error: "Mật khẩu không khớp" };
    }

    // RBAC: only admin can set user password
    const hdrs = new Headers();
    const cs = await cookies();
    const cookieStr = cs.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
    if (cookieStr) hdrs.set("cookie", cookieStr);
    const session = await auth.api.getSession({ headers: hdrs });
    const userContext = getUserContext(session);

    if (!session?.user || session.user.role !== "admin") {
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
    let body: any = null;
    try { body = await res.json(); } catch {}
    if (!res.ok) {
      const msg = body?.message || "Không thể đặt lại mật khẩu";
      logger.error({ ...userContext, targetUserId: userId, targetEmail: targetUser?.email, errorMessage: msg }, "Password reset failed");
      return { success: false, error: msg };
    }

    logger.info({ ...userContext, targetUserId: userId, targetEmail: targetUser?.email }, `User ${userContext.userName} reset password for ${targetUser?.name || targetUser?.email}`);
    revalidatePath("/admin/users");
    return { success: true, message: "Đã đổi mật khẩu người dùng" };
  } catch (e) {
    logger.error({ error: e }, "Unexpected error during password reset");
    return { success: false, error: "Có lỗi xảy ra khi đổi mật khẩu" };
  }
}

export async function setUserPasswordActionState(
  prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  return setUserPasswordAction(formData);
}

export async function deleteUserAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const targetUserId = String(formData.get("userId") || "");
    if (!targetUserId) {
      logger.warn("User deletion failed: Missing userId");
      return { success: false, error: "Thiếu thông tin người dùng" };
    }

    const hdrs = new Headers();
    const cs = await cookies();
    const cookieStr = cs.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
    if (cookieStr) hdrs.set("cookie", cookieStr);
    const session = await auth.api.getSession({ headers: hdrs });
    const userContext = getUserContext(session);

    if (!session?.user || session.user.role !== "admin") {
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
    let body: any = null;
    try { body = await res.json(); } catch {}
    if (!res.ok) {
      const msg = body?.message || "Xóa người dùng thất bại";
      logger.error({ ...userContext, targetUserId, targetEmail: targetUser?.email, errorMessage: msg }, "User deletion failed");
      return { success: false, error: msg };
    }

    logger.info({ ...userContext, targetUserId, targetEmail: targetUser?.email }, `User ${userContext.userName} deleted user ${targetUser?.name || targetUser?.email} (${targetUser?.email})`);
    revalidatePath("/admin/users");
    return { success: true, message: "Đã xóa người dùng" };
  } catch (e) {
    logger.error({ error: e }, "Unexpected error during user deletion");
    return { success: false, error: "Có lỗi xảy ra khi xóa người dùng" };
  }
}

export async function deleteUserActionState(
  prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  return deleteUserAction(formData);
}
