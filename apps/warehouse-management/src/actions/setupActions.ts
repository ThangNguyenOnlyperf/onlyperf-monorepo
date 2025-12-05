"use server";

import { db } from "~/server/db";
import { user, organization, member } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import type { ActionResult } from "./types";
import { signUpEmailServer } from "~/lib/auth-server";
import { logger } from "~/lib/logger";
import { randomBytes } from "crypto";

// Types
export interface SetupState {
  needsSetup: boolean;
  unclaimedOrg: { id: string; name: string; slug: string } | null;
  reason: "no_orgs" | "all_orgs_claimed" | "ready_to_claim";
}

/**
 * Generate a unique member ID
 */
function generateMemberId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(4).toString("hex");
  return `member_${timestamp}${random}`;
}

/**
 * Check setup state - finds first organization without an owner
 */
export async function getSetupState(): Promise<SetupState> {
  // 1. Get all organizations
  const allOrgs = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    })
    .from(organization);

  if (allOrgs.length === 0) {
    return {
      needsSetup: false,
      unclaimedOrg: null,
      reason: "no_orgs",
    };
  }

  // 2. Get all org IDs that have an owner
  const orgsWithOwners = await db
    .select({ orgId: member.organizationId })
    .from(member)
    .where(eq(member.role, "owner"));

  const ownerOrgIds = new Set(orgsWithOwners.map((m) => m.orgId));

  // 3. Find orgs without owners
  const unclaimedOrgs = allOrgs.filter((org) => !ownerOrgIds.has(org.id));

  if (unclaimedOrgs.length === 0) {
    return {
      needsSetup: false,
      unclaimedOrg: null,
      reason: "all_orgs_claimed",
    };
  }

  // 4. Return first unclaimed org
  const firstUnclaimed = unclaimedOrgs[0];
  if (!firstUnclaimed) {
    // This shouldn't happen since we checked unclaimedOrgs.length > 0 above
    return {
      needsSetup: false,
      unclaimedOrg: null,
      reason: "all_orgs_claimed",
    };
  }

  return {
    needsSetup: true,
    unclaimedOrg: {
      id: firstUnclaimed.id,
      name: firstUnclaimed.name,
      slug: firstUnclaimed.slug,
    },
    reason: "ready_to_claim",
  };
}

/**
 * Create owner account for an unclaimed organization
 */
export async function createOwnerAction(
  prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "").trim();
    const organizationId = String(formData.get("organizationId") ?? "").trim();

    // Validation
    if (!name || !email || !password || !organizationId) {
      logger.warn(
        {
          name: !!name,
          email: !!email,
          password: !!password,
          organizationId: !!organizationId,
        },
        "Owner setup failed: Missing required fields"
      );
      return { success: false, error: "Thiếu thông tin bắt buộc" };
    }

    logger.info({ email, name, organizationId }, "Owner setup attempt");

    // Verify org exists and still has no owner (race condition check)
    const setupState = await getSetupState();
    if (
      !setupState.needsSetup ||
      setupState.unclaimedOrg?.id !== organizationId
    ) {
      logger.warn(
        { email, organizationId, setupState },
        "Owner setup denied: Organization invalid or already claimed"
      );
      return {
        success: false,
        error: "Tổ chức không hợp lệ hoặc đã có chủ sở hữu",
      };
    }

    // 1. Create user via better-auth
    const createdRes = await signUpEmailServer({ email, password, name });
    if (!createdRes.ok) {
      const rawCode = (createdRes as { body?: { code?: string } })?.body?.code;
      const code = rawCode?.toUpperCase();
      let message = createdRes.error ?? "Tạo tài khoản thất bại";

      if (code === "USER_ALREADY_EXISTS" || /already exists/i.test(message)) {
        message = "Email đã tồn tại";
      } else if (code === "INVALID_EMAIL" || /invalid email/i.test(message)) {
        message = "Email không hợp lệ";
      } else if (code === "WEAK_PASSWORD" || /password/i.test(message)) {
        message = "Mật khẩu không đủ mạnh (tối thiểu 8 ký tự)";
      }

      logger.error(
        { email, code, errorMessage: message },
        "Owner setup failed: User creation failed"
      );
      return { success: false, error: message };
    }

    const userId = createdRes.user?.id;
    if (!userId) {
      logger.error({ email }, "Owner setup failed: No user ID returned");
      return { success: false, error: "Không thể lấy thông tin người dùng" };
    }

    // 2. Update user role to admin (for app-level permissions)
    await db.update(user).set({ role: "admin" }).where(eq(user.email, email));

    // 3. Create member record linking user to organization as owner
    const memberId = generateMemberId();
    await db.insert(member).values({
      id: memberId,
      userId: userId,
      organizationId: organizationId,
      role: "owner",
      createdAt: new Date(),
    });

    logger.info(
      { email, name, userId, organizationId, memberId },
      `Owner setup completed: ${name} (${email}) is now owner of org ${organizationId}`
    );

    return { success: true, message: "Thiết lập thành công" };
  } catch (e) {
    logger.error({ error: e }, "Unexpected error during owner setup");
    return { success: false, error: "Có lỗi xảy ra khi thiết lập tài khoản" };
  }
}
