CREATE TABLE "colors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"hex" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "colors_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "shopify_products" (
	"product_id" text PRIMARY KEY NOT NULL,
	"shopify_product_id" text NOT NULL,
	"shopify_variant_id" text NOT NULL,
	"shopify_inventory_item_id" text,
	"last_synced_at" timestamp,
	"last_sync_status" text DEFAULT 'pending' NOT NULL,
	"last_sync_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "color" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "shopify_products" ADD CONSTRAINT "shopify_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "colors_name_idx" ON "colors" USING btree ("name");--> statement-breakpoint
CREATE INDEX "shopify_products_product_id_idx" ON "shopify_products" USING btree ("shopify_product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shopify_products_variant_id_idx" ON "shopify_products" USING btree ("shopify_variant_id");