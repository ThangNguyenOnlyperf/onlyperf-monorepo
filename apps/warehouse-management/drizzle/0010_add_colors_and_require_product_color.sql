-- Add a colors catalog table and require products.color

CREATE TABLE IF NOT EXISTS "colors" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL UNIQUE,
  "hex" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "colors_name_idx" ON "colors" ("name");

-- Backfill existing products with a placeholder color if missing
UPDATE "products" SET "color" = 'Unknown' WHERE "color" IS NULL;

-- Enforce NOT NULL on products.color going forward
ALTER TABLE "products" ALTER COLUMN "color" SET NOT NULL;

-- Optional (non-unique) helper index for queries by model/color
CREATE INDEX IF NOT EXISTS "products_model_color_idx" ON "products" ("model", "color");

