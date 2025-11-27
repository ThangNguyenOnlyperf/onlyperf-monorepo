-- Drop unique constraint on shopify_product_id so multiple variants can map to the same product
DROP INDEX IF EXISTS "shopify_products_product_id_idx";
CREATE INDEX IF NOT EXISTS "shopify_products_product_id_idx"
  ON "shopify_products" ("shopify_product_id");
