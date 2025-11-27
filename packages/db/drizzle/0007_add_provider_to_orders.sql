-- Add provider tracking to orders table
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "provider_id" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customer_type" text DEFAULT 'b2c' NOT NULL;
ALTER TABLE "orders" ADD CONSTRAINT "orders_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX IF NOT EXISTS "orders_provider_id_idx" ON "orders" USING btree ("provider_id");