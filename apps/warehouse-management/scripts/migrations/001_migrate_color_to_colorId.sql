-- Migration: Convert products.color (string) to products.color_id (foreign key)
-- Date: 2025-11-25
-- Description: Migrate existing color names to color IDs with proper foreign key references
--
-- IMPORTANT: Run this in a transaction. If anything fails, it will rollback.
-- Usage: psql -d your_database -f scripts/migrations/001_migrate_color_to_colorId.sql

BEGIN;

-- Step 1: Add color_id column as NULLABLE first
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "color_id" text;

-- Step 2: Create a default "Unknown" color if it doesn't exist
INSERT INTO "colors" (id, name, hex, created_at, updated_at)
SELECT 'col_unknown', 'Unknown', '#808080', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM colors WHERE name = 'Unknown');

-- Step 3: Insert any missing colors from products into colors table
-- This creates color records for any color names that don't exist yet
INSERT INTO "colors" (id, name, hex, created_at, updated_at)
SELECT
    'col_' || EXTRACT(EPOCH FROM NOW())::bigint || '_' || ROW_NUMBER() OVER (),
    DISTINCT_COLORS.color,
    '#808080', -- Default gray hex for colors without a defined hex
    NOW(),
    NOW()
FROM (
    SELECT DISTINCT color
    FROM products
    WHERE color IS NOT NULL
      AND TRIM(color) != ''
      AND color NOT IN (SELECT name FROM colors)
) AS DISTINCT_COLORS;

-- Step 4: Update products.color_id to reference the correct color
UPDATE products
SET color_id = colors.id
FROM colors
WHERE products.color = colors.name
  AND products.color_id IS NULL;

-- Step 5: Handle products with NULL or empty color - assign to "Unknown"
UPDATE products
SET color_id = (SELECT id FROM colors WHERE name = 'Unknown' LIMIT 1)
WHERE color_id IS NULL
  AND (color IS NULL OR TRIM(color) = '');

-- Step 6: Final fallback - assign any remaining NULL color_id to "Unknown"
-- This catches any edge cases (whitespace-only values, etc.)
UPDATE products
SET color_id = (SELECT id FROM colors WHERE name = 'Unknown' LIMIT 1)
WHERE color_id IS NULL;

-- Step 7: Verify all products have a color_id (safety check)
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count FROM products WHERE color_id IS NULL;
    IF null_count > 0 THEN
        RAISE EXCEPTION 'Migration failed: % products still have NULL color_id', null_count;
    END IF;
END $$;

-- Step 5: Make color_id NOT NULL
ALTER TABLE "products" ALTER COLUMN "color_id" SET NOT NULL;

-- Step 6: Add foreign key constraint
ALTER TABLE "products"
ADD CONSTRAINT "products_color_id_colors_id_fk"
FOREIGN KEY ("color_id") REFERENCES "public"."colors"("id")
ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Step 7: Create index for performance
CREATE INDEX IF NOT EXISTS "products_color_id_idx" ON "products" USING btree ("color_id");

-- Step 8: Drop the old color column
ALTER TABLE "products" DROP COLUMN IF EXISTS "color";

-- Step 9: Add other columns from the migration if they don't exist
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "product_type" text DEFAULT 'general' NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_pack_product" boolean DEFAULT false NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "pack_size" integer;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "base_product_id" text;

-- Step 10: Create indexes for new columns
CREATE INDEX IF NOT EXISTS "products_product_type_idx" ON "products" USING btree ("product_type");
CREATE INDEX IF NOT EXISTS "products_base_product_id_idx" ON "products" USING btree ("base_product_id");

-- Step 11: Add checkout_sessions columns if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'checkout_sessions') THEN
        ALTER TABLE "checkout_sessions" ADD COLUMN IF NOT EXISTS "discount_codes" jsonb;
        ALTER TABLE "checkout_sessions" ADD COLUMN IF NOT EXISTS "discount_amount" integer;
    END IF;
END $$;

COMMIT;

-- Verification query (run this after to check the migration)
-- SELECT p.id, p.name, p.color_id, c.name as color_name, c.hex
-- FROM products p
-- JOIN colors c ON p.color_id = c.id
-- LIMIT 10;
