ALTER TABLE "checkout_sessions" ADD COLUMN "discount_codes" jsonb;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD COLUMN "discount_amount" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "color_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "product_type" text DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_pack_product" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "pack_size" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "base_product_id" text;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_color_id_colors_id_fk" FOREIGN KEY ("color_id") REFERENCES "public"."colors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "products_color_id_idx" ON "products" USING btree ("color_id");--> statement-breakpoint
CREATE INDEX "products_product_type_idx" ON "products" USING btree ("product_type");--> statement-breakpoint
CREATE INDEX "products_base_product_id_idx" ON "products" USING btree ("base_product_id");--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "color";