"use server";

import { db } from "~/server/db";
import { user } from "~/server/db/schema";
import { count, eq } from "drizzle-orm";
import type { ActionResult } from "./types";
import { signUpEmailServer } from "~/lib/auth-server";
import { logger } from "~/lib/logger";

export async function getSetupState(): Promise<{ needsSetup: boolean; totalUsers: number; totalAdmins: number }> {
  const [usersRes, adminsRes] = await Promise.all([
    db.select({ c: count() }).from(user),
    db.select({ c: count() }).from(user).where(eq(user.role, "admin")),
  ]);
  const totalUsers = usersRes?.[0]?.c ?? 0;
  const totalAdmins = adminsRes?.[0]?.c ?? 0;
  return {
    needsSetup: totalUsers === 0 || totalAdmins === 0,
    totalUsers,
    totalAdmins,
  };
}

export async function createAdminAction(prevState: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  try {
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "").trim();

    if (!name || !email || !password) {
      logger.warn({ name: !!name, email: !!email, password: !!password }, "Admin setup failed: Missing required fields");
      return { success: false, error: "Thiếu thông tin bắt buộc" };
    }

    logger.info({ adminEmail: email, adminName: name }, "Initial admin setup attempt");

    const admins = await db.select({ c: count() }).from(user).where(eq(user.role, "admin"));
    const adminCount = admins?.[0]?.c ?? 0;
    if (adminCount > 0) {
      logger.warn({ adminEmail: email, existingAdminCount: adminCount }, "Admin setup denied: System already configured");
      return { success: false, error: "Hệ thống đã được thiết lập trước đó" };
    }

    const createdRes = await signUpEmailServer({ email, password, name });
    if (!createdRes.ok) {
      logger.error({ adminEmail: email, errorMessage: createdRes.error }, "Admin setup failed: Account creation failed");
      return { success: false, error: createdRes.error || "Tạo tài khoản thất bại" };
    }

    await db.update(user).set({ role: "admin" }).where(eq(user.email, email));

    logger.info({ adminEmail: email, adminName: name }, `Initial admin setup completed: ${name} (${email})`);
    return { success: true, message: "Tạo admin thành công" };
  } catch (e) {
    logger.error({ error: e }, "Unexpected error during admin setup");
    return { success: false, error: "Có lỗi xảy ra khi tạo admin" };
  }
}

