import { headers } from "next/headers";
import { auth } from "./auth";

/**
 * Role permissions matrix
 * Defines what each role can do in the system
 */
export const PERMISSIONS = {
  admin: [
    // Full system access
    "*",
  ],
  user: [
    // Default warehouse staff permissions
    "view:products",
    "create:products",
    "update:products",
    "scan:qr",
    "view:shipments",
    "create:shipments",
    "update:shipments",
    "view:orders",
    "create:orders",
    "update:orders",
    "view:customers",
    "create:customers",
    "update:customers",
    "view:storages",
    "view:inventory",
    "create:outbound",
    "view:outbound",
  ],
  accountant: [
    // Financial and reporting permissions
    "view:reports",
    "view:orders",
    "view:payments",
    "view:customers",
    "view:shipments",
    "view:products",
    "view:inventory",
  ],
} as const;

export type Role = keyof typeof PERMISSIONS;
export type Permission = (typeof PERMISSIONS)[Role][number];

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: string): boolean {
  const rolePermissions = PERMISSIONS[role] as readonly string[];

  // Admin has all permissions
  if (rolePermissions.includes("*")) {
    return true;
  }

  // Check for exact permission match
  return rolePermissions.includes(permission);
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(
  role: Role,
  permissions: string[]
): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

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
