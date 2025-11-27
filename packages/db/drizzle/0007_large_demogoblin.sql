ALTER TABLE "sse_events" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "sse_events" CASCADE;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "provider_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_type" text DEFAULT 'b2c' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_provider_id_idx" ON "orders" USING btree ("provider_id");