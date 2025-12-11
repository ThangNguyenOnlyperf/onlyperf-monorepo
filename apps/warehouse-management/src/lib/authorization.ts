import { headers } from "next/headers";
import { auth } from "./auth";
import { db } from "~/server/db";
import { member } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import {
  P,
  PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  type Role,
  type Permission,
} from "./permissions";

// Re-export shared types and constants for backward compatibility
export { P, PERMISSIONS, hasPermission, hasAnyPermission };
export type { Role, Permission };

/**
 * Require authentication and optionally check for specific roles or permissions
 * @param options.roles - Array of allowed roles
 * @param options.permissions - Array of required permissions (user needs at least one)
 * @throws Error if user is not authenticated or doesn't have required permissions
 * @returns Session with user information
 */
export async function requireAuth(options?: {
  roles?: Role[];
  permissions?: string[];
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.");
  }

  const userRole = (session.user.role as Role) ?? "user";

  // Check role requirement
  if (options?.roles && !options.roles.includes(userRole)) {
    throw new Error(
      `Không có quyền truy cập. Yêu cầu vai trò: ${options.roles.join(" hoặc ")}`
    );
  }

  // Check permission requirement
  if (options?.permissions && !hasAnyPermission(userRole, options.permissions)) {
    throw new Error(
      `Không có quyền thực hiện thao tác này. Yêu cầu quyền: ${options.permissions.join(" hoặc ")}`
    );
  }

  return {
    ...session,
    user: {
      ...session.user,
      role: userRole,
    },
  };
}

/**
 * Get current session without throwing errors
 * Useful for optional authentication checks
 */
export async function getSession() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session;
  } catch {
    return null;
  }
}

/**
 * Check if current user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return session?.user?.role === "admin";
}

/**
 * Require admin role
 */
export async function requireAdmin() {
  return requireAuth({ roles: ["admin"] });
}

// =============================================================================
// Multi-tenancy: Organization context helpers
// =============================================================================

/**
 * Org role to app role mapping
 * org owner/admin -> app admin
 * org member -> app user
 */
const ORG_ROLE_TO_APP_ROLE: Record<string, Role> = {
  owner: "admin",
  admin: "admin",
  supervisor: "supervisor",
  member: "user",
};

export interface OrgContext {
  organizationId: string;
  userId: string;
  userName: string;
  userRole: Role;
  orgRole: string;
  session: Awaited<ReturnType<typeof auth.api.getSession>>;
}

/**
 * Require authentication with organization context
 * This is the main authorization function for multi-tenant operations
 *
 * @param options.permissions - Array of required permissions (user needs at least one)
 * @throws Error if user is not authenticated, no org selected, or not a member
 * @returns OrgContext with organizationId, userId, userRole, orgRole
 */
export async function requireOrgContext(options?: {
  permissions?: string[];
}): Promise<OrgContext> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.");
  }

  // Get activeOrganizationId from session
  const activeOrgId = (session.session as { activeOrganizationId?: string })?.activeOrganizationId;

  if (!activeOrgId) {
    throw new Error("Chưa chọn tổ chức. Vui lòng chọn tổ chức để tiếp tục.");
  }

  // Verify membership
  const membership = await db.query.member.findFirst({
    where: and(
      eq(member.userId, session.user.id),
      eq(member.organizationId, activeOrgId)
    ),
  });

  if (!membership) {
    throw new Error("Bạn không còn là thành viên của tổ chức này.");
  }

  // Map org role to app role
  const appRole = ORG_ROLE_TO_APP_ROLE[membership.role] ?? "user";

  // Check permissions
  if (options?.permissions && !hasAnyPermission(appRole, options.permissions)) {
    throw new Error(
      `Không có quyền thực hiện thao tác này. Yêu cầu quyền: ${options.permissions.join(" hoặc ")}`
    );
  }

  return {
    organizationId: activeOrgId,
    userId: session.user.id,
    userName: session.user.name ?? "Unknown",
    userRole: appRole,
    orgRole: membership.role,
    session,
  };
}

/**
 * Get organization context without throwing errors
 * Useful for optional organization context checks
 */
export async function getOrgContext(): Promise<OrgContext | null> {
  try {
    return await requireOrgContext();
  } catch {
    return null;
  }
}
