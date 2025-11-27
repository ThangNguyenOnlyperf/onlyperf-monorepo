-- Map warehouse products to Shopify entities

CREATE TABLE IF NOT EXISTS "shopify_products" (
  "product_id" text PRIMARY KEY REFERENCES "products"("id") ON DELETE CASCADE,
  "shopify_product_id" text NOT NULL,
  "shopify_variant_id" text NOT NULL,
  "shopify_inventory_item_id" text,
  "last_synced_at" timestamp,
  "last_sync_status" text NOT NULL DEFAULT 'pending',
  "last_sync_error" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "shopify_products_product_id_idx"
  ON "shopify_products" ("shopify_product_id");

CREATE UNIQUE INDEX IF NOT EXISTS "shopify_products_variant_id_idx"
  ON "shopify_products" ("shopify_variant_id");
