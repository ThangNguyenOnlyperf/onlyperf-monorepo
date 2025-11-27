CREATE TABLE "storages" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"capacity" integer NOT NULL,
	"used_capacity" integer DEFAULT 0 NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shipment_items" ADD COLUMN "storage_id" text;--> statement-breakpoint
ALTER TABLE "shipment_items" ADD COLUMN "scanned_at" timestamp;--> statement-breakpoint
ALTER TABLE "storages" ADD CONSTRAINT "storages_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "storages_name_idx" ON "storages" USING btree ("name");--> statement-breakpoint
CREATE INDEX "storages_priority_idx" ON "storages" USING btree ("priority");--> statement-breakpoint
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_storage_id_storages_id_fk" FOREIGN KEY ("storage_id") REFERENCES "public"."storages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shipment_items_storage_id_idx" ON "shipment_items" USING btree ("storage_id");