import { pgTable, text, timestamp, boolean, integer, date, index, uniqueIndex, jsonb, type AnyPgColumn } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("user"),
  emailVerified: boolean("email_verified").notNull(),
  // Admin plugin fields
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  role: text("role").notNull().default("user"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  activeOrganizationId: text("active_organization_id"), // Multi-tenancy: current active org
  impersonatedBy: text("impersonated_by"), // Admin plugin: impersonation
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// =============================================================================
// Multi-tenancy: Organization tables (Better-auth organization plugin)
// =============================================================================

export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  slugIdx: uniqueIndex("organization_slug_idx").on(table.slug),
}));

export const member = pgTable("member", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'owner' | 'admin' | 'member'
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userOrgIdx: uniqueIndex("member_user_org_idx").on(table.userId, table.organizationId),
  orgIdx: index("member_org_idx").on(table.organizationId),
}));

export const invitation = pgTable("invitation", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  inviterId: text("inviter_id").notNull().references(() => user.id),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  emailOrgIdx: index("invitation_email_org_idx").on(table.email, table.organizationId),
  orgIdx: index("invitation_org_idx").on(table.organizationId),
}));

export const organizationSettings = pgTable("organization_settings", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().unique().references(() => organization.id, { onDelete: "cascade" }),
  // Shopify integration
  shopifyEnabled: boolean("shopify_enabled").notNull().default(false),
  shopifyStoreDomain: text("shopify_store_domain"),
  shopifyAdminApiAccessToken: text("shopify_admin_api_access_token"),
  shopifyApiVersion: text("shopify_api_version").default("2025-04"),
  shopifyLocationId: text("shopify_location_id"),
  shopifyWebhookSecret: text("shopify_webhook_secret"),
  // Other org-specific settings
  defaultWarrantyMonths: integer("default_warranty_months").notNull().default(12),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: uniqueIndex("organization_settings_org_idx").on(table.organizationId),
}));

// Brand management table
export const brands = pgTable("brands", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  nameIdx: index("brands_name_idx").on(table.name),
  orgIdx: index("brands_org_idx").on(table.organizationId),
  orgNameUnique: uniqueIndex("brands_org_name_unique").on(table.organizationId, table.name),
}));

// Product management tables
export const products = pgTable("products", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  brand: text("brand").notNull(), // Keep for backward compatibility, will migrate data
  brandId: text("brand_id").references(() => brands.id),
  model: text("model").notNull(),
  qrCode: text("qr_code").unique(),
  description: text("description"),
  category: text("category"),
  // New product attributes
  colorId: text("color_id").references(() => colors.id).notNull(),
  weight: text("weight"),
  size: text("size"),
  thickness: text("thickness"),
  material: text("material"),
  handleLength: text("handle_length"),
  handleCircumference: text("handle_circumference"),
  price: integer("price").notNull().default(0), // Price in VND (stored as integer to avoid decimal issues)
  // Product type fields for pack support
  productType: text("product_type").notNull().default("general"), // 'general' | 'individual' | 'ball'
  isPackProduct: boolean("is_pack_product").notNull().default(false), // true for "Ball 3-Pack"
  packSize: integer("pack_size"), // null for individual/base, 3/6/10 for packs
  baseProductId: text("base_product_id").references((): AnyPgColumn => products.id, { onDelete: "cascade" }), // Self-reference: links pack to base product
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("products_org_idx").on(table.organizationId),
  brandIdx: index("products_brand_idx").on(table.brand),
  brandIdIdx: index("products_brand_id_idx").on(table.brandId),
  colorIdIdx: index("products_color_id_idx").on(table.colorId),
  modelIdx: index("products_model_idx").on(table.model),
  qrCodeIdx: index("products_qr_code_idx").on(table.qrCode),
  brandModelUnique: index("products_brand_model_unique").on(table.brandId, table.model),
  productTypeIdx: index("products_product_type_idx").on(table.productType),
  baseProductIdIdx: index("products_base_product_id_idx").on(table.baseProductId),
  // Unique constraint: only one pack product per (baseProductId, packSize) combination
  basePackUnique: uniqueIndex("products_base_pack_unique")
    .on(table.baseProductId, table.packSize)
    .where(sql`${table.isPackProduct} = true`),
}));

export const shopifyProducts = pgTable("shopify_products", {
  productId: text("product_id")
    .primaryKey()
    .references(() => products.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  shopifyProductId: text("shopify_product_id").notNull(),
  shopifyVariantId: text("shopify_variant_id").notNull(),
  shopifyInventoryItemId: text("shopify_inventory_item_id"),
  lastSyncedAt: timestamp("last_synced_at"),
  lastSyncStatus: text("last_sync_status").notNull().default("pending"),
  lastSyncError: text("last_sync_error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("shopify_products_org_idx").on(table.organizationId),
  shopifyProductIdIdx: index("shopify_products_product_id_idx").on(table.shopifyProductId),
  shopifyVariantIdIdx: uniqueIndex("shopify_products_variant_id_idx").on(table.shopifyVariantId),
}));

// Color catalog (per organization)
export const colors = pgTable("colors", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  hex: text("hex").notNull(), // e.g. #FF0000
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  nameIdx: index("colors_name_idx").on(table.name),
  orgIdx: index("colors_org_idx").on(table.organizationId),
  orgNameUnique: uniqueIndex("colors_org_name_unique").on(table.organizationId, table.name),
}));

export const providers = pgTable("providers", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  name: text("name").notNull(),
  taxCode: text("tax_code"),
  address: text("address"),
  telephone: text("telephone").notNull(),
  accountNo: text("account_no"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("providers_org_idx").on(table.organizationId),
  typeIdx: index("providers_type_idx").on(table.type),
  nameIdx: index("providers_name_idx").on(table.name),
  telephoneIdx: index("providers_telephone_idx").on(table.telephone),
}));

export const shipments = pgTable("shipments", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  receiptNumber: text("receipt_number").notNull(),
  receiptDate: date("receipt_date").notNull(),
  supplierName: text("supplier_name").notNull(),
  providerId: text("provider_id").references(() => providers.id),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdBy: text("created_by").references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("shipments_org_idx").on(table.organizationId),
  receiptNumberIdx: index("shipments_receipt_number_idx").on(table.receiptNumber),
  orgReceiptUnique: uniqueIndex("shipments_org_receipt_unique").on(table.organizationId, table.receiptNumber),
  statusIdx: index("shipments_status_idx").on(table.status),
  createdAtIdx: index("shipments_created_at_idx").on(table.createdAt),
  providerIdIdx: index("shipments_provider_id_idx").on(table.providerId),
}));

export const shipmentItems = pgTable("shipment_items", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  shipmentId: text("shipment_id").notNull().references(() => shipments.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  qrCode: text("qr_code").unique().notNull(),
  // Status flow: pending → received (inbound) → allocated (Shopify order) → sold (QR scanned)
  // In-store orders skip 'allocated' and go directly: received → sold
  status: text("status").notNull().default("pending"),
  storageId: text("storage_id").references(() => storages.id),
  scannedAt: timestamp("scanned_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),

  // =============================================================================
  // Customer Portal Fields (warranty, ownership, authentication)
  // =============================================================================

  // Warranty tracking (starts on delivery confirmation, not purchase)
  deliveredAt: timestamp("delivered_at"),
  warrantyMonths: integer("warranty_months").notNull().default(12),
  warrantyStatus: text("warranty_status").notNull().default("pending"), // pending | active | expired | void

  // Ownership (Shopify customer GID - for ownership transfer feature)
  currentOwnerId: text("current_owner_id"), // Shopify customer GID e.g., gid://shopify/Customer/123

  // Customer scan analytics (different from fulfillment scans)
  firstScannedByCustomerAt: timestamp("first_scanned_by_customer_at"),
  lastScannedByCustomerAt: timestamp("last_scanned_by_customer_at"),
  customerScanCount: integer("customer_scan_count").notNull().default(0),

  // Authentication flag (for anti-counterfeit)
  isAuthentic: boolean("is_authentic").notNull().default(true),
}, (table) => ({
  orgIdx: index("shipment_items_org_idx").on(table.organizationId),
  shipmentIdIdx: index("shipment_items_shipment_id_idx").on(table.shipmentId),
  productIdIdx: index("shipment_items_product_id_idx").on(table.productId),
  qrCodeIdx: index("shipment_items_qr_code_idx").on(table.qrCode),
  statusIdx: index("shipment_items_status_idx").on(table.status),
  storageIdIdx: index("shipment_items_storage_id_idx").on(table.storageId),
  // Customer portal indexes
  currentOwnerIdx: index("shipment_items_current_owner_idx").on(table.currentOwnerId),
  warrantyStatusIdx: index("shipment_items_warranty_status_idx").on(table.warrantyStatus),
}));

export const storages = pgTable("storages", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  location: text("location").notNull(),
  capacity: integer("capacity").notNull(),
  usedCapacity: integer("used_capacity").notNull().default(0),
  priority: integer("priority").notNull().default(0),
  createdBy: text("created_by").references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("storages_org_idx").on(table.organizationId),
  nameIdx: index("storages_name_idx").on(table.name),
  priorityIdx: index("storages_priority_idx").on(table.priority),
}));

// Customer management table
export const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("customers_org_idx").on(table.organizationId),
  phoneIdx: index("customers_phone_idx").on(table.phone),
  orgPhoneUnique: uniqueIndex("customers_org_phone_unique").on(table.organizationId, table.phone),
}));

// Order management table
export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  orderNumber: text("order_number").notNull(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  providerId: text("provider_id").references(() => providers.id), // For B2B sales tracking
  customerType: text("customer_type").notNull().default("b2c"), // 'b2b' or 'b2c'
  source: text("source").notNull().default("in-store"), // 'in-store', 'shopify', or 'manual'
  shopifyOrderId: text("shopify_order_id"), // Shopify order GID (e.g., gid://shopify/Order/123)
  shopifyOrderNumber: text("shopify_order_number"), // Human-readable Shopify order number (e.g., #1001)
  totalAmount: integer("total_amount").notNull(), // Amount in VND (stored as integer)
  paymentMethod: text("payment_method").notNull(), // 'cash' or 'bank_transfer'
  paymentStatus: text("payment_status").notNull().default("Unpaid"), // 'Unpaid', 'Paid', 'Cancelled', 'Refunded'
  paymentCode: text("payment_code"), // Order-specific payment code (e.g., "DH12345")
  deliveryStatus: text("delivery_status").notNull().default("processing"), // processing, shipped, waiting_for_delivery, delivered, failed
  fulfillmentStatus: text("fulfillment_status").notNull().default("fulfilled"), // 'pending', 'in_progress', 'fulfilled' (for Shopify orders awaiting manual fulfillment)
  voucherCode: text("voucher_code"), // For future use
  notes: text("notes"),
  processedBy: text("processed_by").references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("orders_org_idx").on(table.organizationId),
  orderNumberIdx: index("orders_order_number_idx").on(table.orderNumber),
  orgOrderUnique: uniqueIndex("orders_org_order_unique").on(table.organizationId, table.orderNumber),
  customerIdIdx: index("orders_customer_id_idx").on(table.customerId),
  providerIdIdx: index("orders_provider_id_idx").on(table.providerId),
  paymentCodeIdx: index("orders_payment_code_idx").on(table.paymentCode),
  deliveryStatusIdx: index("orders_delivery_status_idx").on(table.deliveryStatus),
  fulfillmentStatusIdx: index("orders_fulfillment_status_idx").on(table.fulfillmentStatus),
  createdAtIdx: index("orders_created_at_idx").on(table.createdAt),
  sourceIdx: index("orders_source_idx").on(table.source),
  shopifyOrderIdIdx: index("orders_shopify_order_id_idx").on(table.shopifyOrderId),
}));

// Order items table (links shipment items to orders)
// For Shopify orders: shipmentItemId is NULL until staff scans during fulfillment
// For in-store orders: shipmentItemId is set immediately during order creation
export const orderItems = pgTable("order_items", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  shipmentItemId: text("shipment_item_id").references(() => shipmentItems.id), // Nullable for manual fulfillment
  productId: text("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  price: integer("price").notNull(), // Snapshot of price at sale time (in VND)
  qrCode: text("qr_code"), // Nullable - populated when shipmentItemId is set
  fulfillmentStatus: text("fulfillment_status").notNull().default("fulfilled"), // 'pending', 'fulfilled'
  scannedAt: timestamp("scanned_at"), // When item was scanned during fulfillment
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("order_items_org_idx").on(table.organizationId),
  orderIdIdx: index("order_items_order_id_idx").on(table.orderId),
  shipmentItemIdIdx: index("order_items_shipment_item_id_idx").on(table.shipmentItemId),
  qrCodeIdx: index("order_items_qr_code_idx").on(table.qrCode),
  fulfillmentStatusIdx: index("order_items_fulfillment_status_idx").on(table.fulfillmentStatus),
}));

// Scanning sessions for multi-device sync
export const scanningSessions = pgTable("scanning_sessions", {
  id: text("id").primaryKey().notNull().$defaultFn(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  cartItems: text("cart_items").notNull().default("[]"), // JSON array of cart items
  customerInfo: text("customer_info").notNull().default("{}"), // JSON object
  deviceCount: integer("device_count").notNull().default(0),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  lastPing: timestamp("last_ping").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("scanning_sessions_org_idx").on(table.organizationId),
  userIdIdx: index("scanning_sessions_user_id_idx").on(table.userId),
  orgUserUnique: uniqueIndex("scanning_sessions_org_user_unique").on(table.organizationId, table.userId),
  lastUpdatedIdx: index("scanning_sessions_last_updated_idx").on(table.lastUpdated),
}));

// Delivery tracking table
export const deliveries = pgTable("deliveries", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  shipperName: text("shipper_name").notNull(),
  shipperPhone: text("shipper_phone"),
  trackingNumber: text("tracking_number"),
  shopifyFulfillmentId: text("shopify_fulfillment_id"), // Shopify fulfillment GID for syncing delivery status
  status: text("status").notNull().default("waiting_for_delivery"), // waiting_for_delivery, delivered, failed, cancelled
  deliveredAt: timestamp("delivered_at"),
  failureReason: text("failure_reason"),
  failureCategory: text("failure_category"), // customer_unavailable, wrong_address, damaged_package, refused_delivery
  notes: text("notes"),
  confirmedBy: text("confirmed_by").references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("deliveries_org_idx").on(table.organizationId),
  orderIdIdx: index("deliveries_order_id_idx").on(table.orderId),
  statusIdx: index("deliveries_status_idx").on(table.status),
  deliveredAtIdx: index("deliveries_delivered_at_idx").on(table.deliveredAt),
  trackingNumberIdx: index("deliveries_tracking_number_idx").on(table.trackingNumber),
}));

// Delivery history for audit trail
export const deliveryHistory = pgTable("delivery_history", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  deliveryId: text("delivery_id").notNull().references(() => deliveries.id, { onDelete: "cascade" }),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  notes: text("notes"),
  changedBy: text("changed_by").references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("delivery_history_org_idx").on(table.organizationId),
  deliveryIdIdx: index("delivery_history_delivery_id_idx").on(table.deliveryId),
  createdAtIdx: index("delivery_history_created_at_idx").on(table.createdAt),
}));

// Failed delivery resolutions
export const deliveryResolutions = pgTable("delivery_resolutions", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  deliveryId: text("delivery_id").notNull().references(() => deliveries.id, { onDelete: "cascade" }),
  resolutionType: text("resolution_type").notNull(), // re_import, return_to_supplier, retry_delivery
  resolutionStatus: text("resolution_status").notNull().default("pending"), // pending, in_progress, completed
  targetStorageId: text("target_storage_id").references(() => storages.id), // For re-import
  supplierReturnReason: text("supplier_return_reason"), // For returns
  scheduledDate: date("scheduled_date"), // For retry delivery
  completedAt: timestamp("completed_at"),
  processedBy: text("processed_by").references(() => user.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("delivery_resolutions_org_idx").on(table.organizationId),
  deliveryIdIdx: index("delivery_resolutions_delivery_id_idx").on(table.deliveryId),
  resolutionTypeIdx: index("delivery_resolutions_type_idx").on(table.resolutionType),
  resolutionStatusIdx: index("delivery_resolutions_status_idx").on(table.resolutionStatus),
}));

// =============================================================================
// Customer Portal Tables (ownership transfers, scans, warranty claims)
// =============================================================================

// Ownership transfers - Audit trail for product ownership changes
export const ownershipTransfers = pgTable("ownership_transfers", {
  id: text("id").primaryKey().$defaultFn(() => `ot_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  shipmentItemId: text("shipment_item_id").notNull().references(() => shipmentItems.id, { onDelete: "cascade" }),
  fromOwnerId: text("from_owner_id").notNull(), // Shopify customer GID
  toOwnerId: text("to_owner_id").notNull(), // Shopify customer GID
  transferredAt: timestamp("transferred_at").notNull().defaultNow(),
  warrantyTransferred: boolean("warranty_transferred").notNull().default(true),
}, (table) => ({
  orgIdx: index("ownership_transfers_org_idx").on(table.organizationId),
  shipmentItemIdx: index("ownership_transfers_shipment_item_idx").on(table.shipmentItemId),
  fromOwnerIdx: index("ownership_transfers_from_owner_idx").on(table.fromOwnerId),
  toOwnerIdx: index("ownership_transfers_to_owner_idx").on(table.toOwnerId),
}));

// Location type for customer scans
export type CustomerScanLocation = {
  country?: string;
  city?: string;
  lat?: number;
  lng?: number;
};

// Customer scans - Analytics for QR code scanning by customers
export const customerScans = pgTable("customer_scans", {
  id: text("id").primaryKey().$defaultFn(() => `cs_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  qrCode: text("qr_code").notNull(),
  shipmentItemId: text("shipment_item_id").references(() => shipmentItems.id, { onDelete: "cascade" }),
  customerId: text("customer_id"), // Null if not logged in
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  location: jsonb("location").$type<CustomerScanLocation>(),
  scannedAt: timestamp("scanned_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("customer_scans_org_idx").on(table.organizationId),
  qrCodeIdx: index("customer_scans_qr_code_idx").on(table.qrCode),
  shipmentItemIdx: index("customer_scans_shipment_item_idx").on(table.shipmentItemId),
  scannedAtIdx: index("customer_scans_scanned_at_idx").on(table.scannedAt),
}));

// Warranty claims - Customer warranty claim submissions
export const warrantyClaims = pgTable("warranty_claims", {
  id: text("id").primaryKey().$defaultFn(() => `wc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  shipmentItemId: text("shipment_item_id").notNull().references(() => shipmentItems.id, { onDelete: "cascade" }),
  customerId: text("customer_id").notNull(), // Shopify customer GID
  claimType: text("claim_type").notNull(), // defect | damage | repair | replacement
  title: text("title").notNull(),
  description: text("description").notNull(),
  images: jsonb("images").$type<string[]>(), // Array of image URLs
  status: text("status").notNull().default("pending"), // pending | approved | rejected | completed | cancelled
  resolution: text("resolution"),
  internalNotes: text("internal_notes"), // Staff notes
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  resolvedAt: timestamp("resolved_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("warranty_claims_org_idx").on(table.organizationId),
  shipmentItemIdx: index("warranty_claims_shipment_item_idx").on(table.shipmentItemId),
  customerIdx: index("warranty_claims_customer_idx").on(table.customerId),
  statusIdx: index("warranty_claims_status_idx").on(table.status),
}));

export const sepayTransactions = pgTable(
  "sepay_transactions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(
        () => `sepay_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      ),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    sepayTransactionId: text("sepay_transaction_id").unique(),
    gateway: text("gateway").notNull(),
    transactionDate: timestamp("transaction_date", {
      withTimezone: true,
    }).notNull(),
    accountNumber: text("account_number"),
    subAccount: text("sub_account"),
    amountIn: text("amount_in").notNull().default("0"),
    amountOut: text("amount_out").notNull().default("0"),
    accumulated: text("accumulated").notNull().default("0"),
    code: text("code"),
    transactionContent: text("transaction_content"),
    referenceNumber: text("reference_number"),
    body: text("body"),
    transferType: text("transfer_type").notNull(),
    transferAmount: text("transfer_amount").notNull(),
    orderId: text("order_id"),
    processed: boolean("processed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orgIdx: index("sepay_transactions_org_idx").on(table.organizationId),
    sepayTransactionIdIdx: index(
      "sepay_transactions_sepay_transaction_id_idx",
    ).on(table.sepayTransactionId),
    gatewayIdx: index("sepay_transactions_gateway_idx").on(table.gateway),
    transactionDateIdx: index("sepay_transactions_transaction_date_idx").on(
      table.transactionDate,
    ),
    accountNumberIdx: index("sepay_transactions_account_number_idx").on(
      table.accountNumber,
    ),
    referenceNumberIdx: index("sepay_transactions_reference_number_idx").on(
      table.referenceNumber,
    ),
    codeIdx: index("sepay_transactions_code_idx").on(table.code),
    orderIdIdx: index("sepay_transactions_order_id_idx").on(table.orderId),
    processedIdx: index("sepay_transactions_processed_idx").on(table.processed),
    transferTypeIdx: index("sepay_transactions_transfer_type_idx").on(
      table.transferType,
    ),
  }),
);

export const checkoutSessions = pgTable(
  "checkout_sessions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(
        () => `cs_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      ),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    paymentCode: text("payment_code").notNull(),
    cartId: text("cart_id").notNull(),
    linesSnapshot: jsonb("lines_snapshot").notNull(),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("VND"),
    // Customer identification (authenticated or guest)
    email: text("email"),
    customerId: text("customer_id"), // Nullable for guest checkouts
    isGuest: boolean("is_guest").notNull().default(false),
    // Guest customer fields
    guestEmail: text("guest_email"),
    guestPhone: text("guest_phone"),
    guestFirstName: text("guest_first_name"),
    guestLastName: text("guest_last_name"),
    // Payment and delivery
    paymentMethod: text("payment_method")
      .$type<"bank_transfer" | "cod">()
      .notNull()
      .default("bank_transfer"),
    shippingAddress: jsonb("shipping_address"),
    // Discount fields
    discountCodes: jsonb("discount_codes").$type<string[]>(), // Array of discount codes
    discountAmount: integer("discount_amount"), // Total discount amount in cents (VND)
    status: text("status")
      .notNull()
      .$type<"pending" | "paid" | "failed" | "expired">()
      .default("pending"),
    shopifyOrderId: text("shopify_order_id"),
    sepayTransactionId: text("sepay_transaction_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orgIdx: index("checkout_sessions_org_idx").on(table.organizationId),
    paymentCodeIdx: uniqueIndex("checkout_sessions_payment_code_idx").on(
      table.paymentCode,
    ),
    statusIdx: index("checkout_sessions_status_idx").on(table.status),
    sepayTransactionIdx: index("checkout_sessions_sepay_transaction_idx").on(
      table.sepayTransactionId,
    ),
  }),
);

// ============================================================================
// RELATIONS - Drizzle ORM relational query API
// ============================================================================

// Organization relations
export const organizationRelations = relations(organization, ({ many, one }) => ({
  members: many(member),
  invitations: many(invitation),
  settings: one(organizationSettings, {
    fields: [organization.id],
    references: [organizationSettings.organizationId],
  }),
}));

export const memberRelations = relations(member, ({ one }) => ({
  user: one(user, {
    fields: [member.userId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
  inviter: one(user, {
    fields: [invitation.inviterId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [invitation.organizationId],
    references: [organization.id],
  }),
}));

export const organizationSettingsRelations = relations(organizationSettings, ({ one }) => ({
  organization: one(organization, {
    fields: [organizationSettings.organizationId],
    references: [organization.id],
  }),
}));

export const shipmentsRelations = relations(shipments, ({ many, one }) => ({
  items: many(shipmentItems),
  provider: one(providers, {
    fields: [shipments.providerId],
    references: [providers.id],
  }),
  createdByUser: one(user, {
    fields: [shipments.createdBy],
    references: [user.id],
  }),
}));

export const shipmentItemsRelations = relations(shipmentItems, ({ one, many }) => ({
  shipment: one(shipments, {
    fields: [shipmentItems.shipmentId],
    references: [shipments.id],
  }),
  product: one(products, {
    fields: [shipmentItems.productId],
    references: [products.id],
  }),
  storage: one(storages, {
    fields: [shipmentItems.storageId],
    references: [storages.id],
  }),
  // Customer portal relations
  ownershipTransfers: many(ownershipTransfers),
  customerScans: many(customerScans),
  warrantyClaims: many(warrantyClaims),
}));

export const productsRelations = relations(products, ({ many, one }) => ({
  shipmentItems: many(shipmentItems),
  orderItems: many(orderItems),
  shopifyProduct: one(shopifyProducts, {
    fields: [products.id],
    references: [shopifyProducts.productId],
  }),
  brand: one(brands, {
    fields: [products.brandId],
    references: [brands.id],
  }),
  color: one(colors, {
    fields: [products.colorId],
    references: [colors.id],
  }),
  // Self-reference: pack products link to their base product
  baseProduct: one(products, {
    fields: [products.baseProductId],
    references: [products.id],
    relationName: "packProducts",
  }),
  // Reverse: base product has many pack variants
  packProducts: many(products, {
    relationName: "packProducts",
  }),
}));

export const brandsRelations = relations(brands, ({ many }) => ({
  products: many(products),
}));

export const colorsRelations = relations(colors, ({ many }) => ({
  products: many(products),
}));

export const providersRelations = relations(providers, ({ many }) => ({
  shipments: many(shipments),
}));

export const storagesRelations = relations(storages, ({ many, one }) => ({
  shipmentItems: many(shipmentItems),
  createdByUser: one(user, {
    fields: [storages.createdBy],
    references: [user.id],
  }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ many, one }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  provider: one(providers, {
    fields: [orders.providerId],
    references: [providers.id],
  }),
  items: many(orderItems),
  delivery: one(deliveries, {
    fields: [orders.id],
    references: [deliveries.orderId],
  }),
  processedByUser: one(user, {
    fields: [orders.processedBy],
    references: [user.id],
  }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  shipmentItem: one(shipmentItems, {
    fields: [orderItems.shipmentItemId],
    references: [shipmentItems.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const deliveriesRelations = relations(deliveries, ({ one, many }) => ({
  order: one(orders, {
    fields: [deliveries.orderId],
    references: [orders.id],
  }),
  confirmedByUser: one(user, {
    fields: [deliveries.confirmedBy],
    references: [user.id],
  }),
  history: many(deliveryHistory),
}));

export const deliveryHistoryRelations = relations(deliveryHistory, ({ one }) => ({
  delivery: one(deliveries, {
    fields: [deliveryHistory.deliveryId],
    references: [deliveries.id],
  }),
  changedByUser: one(user, {
    fields: [deliveryHistory.changedBy],
    references: [user.id],
  }),
}));

export const userRelations = relations(user, ({ many, one }) => ({
  accounts: many(account),
  sessions: many(session),
  memberships: many(member), // Organization memberships
  createdShipments: many(shipments),
  createdStorages: many(storages),
  processedOrders: many(orders),
  confirmedDeliveries: many(deliveries),
  deliveryHistoryChanges: many(deliveryHistory),
  scanningSession: one(scanningSessions, {
    fields: [user.id],
    references: [scanningSessions.userId],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const scanningSessionsRelations = relations(scanningSessions, ({ one }) => ({
  user: one(user, {
    fields: [scanningSessions.userId],
    references: [user.id],
  }),
}));

export const shopifyProductsRelations = relations(shopifyProducts, ({ one }) => ({
  product: one(products, {
    fields: [shopifyProducts.productId],
    references: [products.id],
  }),
}));

// Customer portal relations
export const ownershipTransfersRelations = relations(ownershipTransfers, ({ one }) => ({
  shipmentItem: one(shipmentItems, {
    fields: [ownershipTransfers.shipmentItemId],
    references: [shipmentItems.id],
  }),
}));

export const customerScansRelations = relations(customerScans, ({ one }) => ({
  shipmentItem: one(shipmentItems, {
    fields: [customerScans.shipmentItemId],
    references: [shipmentItems.id],
  }),
}));

export const warrantyClaimsRelations = relations(warrantyClaims, ({ one }) => ({
  shipmentItem: one(shipmentItems, {
    fields: [warrantyClaims.shipmentItemId],
    references: [shipmentItems.id],
  }),
}));