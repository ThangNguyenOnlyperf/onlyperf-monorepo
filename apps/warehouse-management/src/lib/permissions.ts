/**
 * Shared permission constants and types
 * This file can be imported by both client and server components
 */

/**
 * Type-safe permission constants
 * Use these instead of raw strings to avoid typos
 */
export const P = {
  // Products
  VIEW_PRODUCTS: "view:products",
  CREATE_PRODUCTS: "create:products",
  UPDATE_PRODUCTS: "update:products",
  // QR
  SCAN_QR: "scan:qr",
  VIEW_QR_POOL: "view:qr-pool",
  CREATE_QR_POOL: "create:qr-pool",
  // Shipments
  VIEW_SHIPMENTS: "view:shipments",
  CREATE_SHIPMENTS: "create:shipments",
  UPDATE_SHIPMENTS: "update:shipments",
  UPDATE_SHIPMENT_ITEMS: "update:shipment-items",
  // Orders
  VIEW_ORDERS: "view:orders",
  CREATE_ORDERS: "create:orders",
  UPDATE_ORDERS: "update:orders",
  // Customers
  VIEW_CUSTOMERS: "view:customers",
  CREATE_CUSTOMERS: "create:customers",
  UPDATE_CUSTOMERS: "update:customers",
  // Storages
  VIEW_STORAGES: "view:storages",
  CREATE_STORAGES: "create:storages",
  UPDATE_STORAGES: "update:storages",
  DELETE_STORAGES: "delete:storages",
  // Inventory
  VIEW_INVENTORY: "view:inventory",
  // Outbound
  VIEW_OUTBOUND: "view:outbound",
  CREATE_OUTBOUND: "create:outbound",
  // Bundles
  VIEW_BUNDLES: "view:bundles",
  CREATE_BUNDLES: "create:bundles",
  DELETE_BUNDLES: "delete:bundles",
  // Brands
  CREATE_BRANDS: "create:brands",
  UPDATE_BRANDS: "update:brands",
  DELETE_BRANDS: "delete:brands",
  // Colors
  CREATE_COLORS: "create:colors",
  // Providers
  CREATE_PROVIDERS: "create:providers",
  UPDATE_PROVIDERS: "update:providers",
  DELETE_PROVIDERS: "delete:providers",
  // Deliveries
  CREATE_DELIVERIES: "create:deliveries",
  UPDATE_DELIVERIES: "update:deliveries",
  CREATE_DELIVERY_RESOLUTIONS: "create:delivery-resolutions",
  UPDATE_DELIVERY_RESOLUTIONS: "update:delivery-resolutions",
  // Reports
  VIEW_REPORTS: "view:reports",
} as const;

export type Permission = (typeof P)[keyof typeof P];

export type Role = "admin" | "supervisor" | "user";

/**
 * Base permissions for each role level
 * Roles inherit from lower levels (user < supervisor < admin)
 */
const USER_PERMISSIONS: Permission[] = [
  // Staff: view + scan only
  P.VIEW_PRODUCTS,
  P.SCAN_QR,
  P.VIEW_SHIPMENTS,
  P.VIEW_ORDERS,
  P.VIEW_CUSTOMERS,
  P.VIEW_STORAGES,
  P.VIEW_INVENTORY,
  P.VIEW_OUTBOUND,
  P.VIEW_QR_POOL,
  P.VIEW_BUNDLES,
];

const SUPERVISOR_EXTRA_PERMISSIONS: Permission[] = [
  // Supervisor adds: create/update operations
  P.CREATE_PRODUCTS,
  P.UPDATE_PRODUCTS,
  P.CREATE_SHIPMENTS,
  P.UPDATE_SHIPMENTS,
  P.UPDATE_SHIPMENT_ITEMS,
  P.CREATE_ORDERS,
  P.UPDATE_ORDERS,
  P.CREATE_CUSTOMERS,
  P.UPDATE_CUSTOMERS,
  P.CREATE_STORAGES,
  P.UPDATE_STORAGES,
  P.DELETE_STORAGES,
  P.CREATE_OUTBOUND,
  P.CREATE_QR_POOL,
  P.CREATE_BUNDLES,
  P.DELETE_BUNDLES,
  P.CREATE_BRANDS,
  P.UPDATE_BRANDS,
  P.DELETE_BRANDS,
  P.CREATE_COLORS,
  P.CREATE_PROVIDERS,
  P.UPDATE_PROVIDERS,
  P.DELETE_PROVIDERS,
  P.CREATE_DELIVERIES,
  P.UPDATE_DELIVERIES,
  P.CREATE_DELIVERY_RESOLUTIONS,
  P.UPDATE_DELIVERY_RESOLUTIONS,
  P.VIEW_REPORTS,
];

/**
 * Role permissions matrix with inheritance
 * - user: base view + scan permissions
 * - supervisor: user permissions + create/update
 * - admin: full access (wildcard)
 */
export const PERMISSIONS: Record<Role, readonly string[]> = {
  admin: ["*"],
  supervisor: [...USER_PERMISSIONS, ...SUPERVISOR_EXTRA_PERMISSIONS],
  user: USER_PERMISSIONS,
};

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
