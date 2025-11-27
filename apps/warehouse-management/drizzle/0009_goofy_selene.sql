CREATE TABLE "deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"shipper_name" text NOT NULL,
	"shipper_phone" text,
	"tracking_number" text,
	"status" text DEFAULT 'waiting_for_delivery' NOT NULL,
	"delivered_at" timestamp,
	"failure_reason" text,
	"failure_category" text,
	"notes" text,
	"confirmed_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_history" (
	"id" text PRIMARY KEY NOT NULL,
	"delivery_id" text NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"notes" text,
	"changed_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_resolutions" (
	"id" text PRIMARY KEY NOT NULL,
	"delivery_id" text NOT NULL,
	"resolution_type" text NOT NULL,
	"resolution_status" text DEFAULT 'pending' NOT NULL,
	"target_storage_id" text,
	"supplier_return_reason" text,
	"scheduled_date" date,
	"completed_at" timestamp,
	"processed_by" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_status" text DEFAULT 'processing' NOT NULL;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_confirmed_by_user_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_history" ADD CONSTRAINT "delivery_history_delivery_id_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_history" ADD CONSTRAINT "delivery_history_changed_by_user_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_resolutions" ADD CONSTRAINT "delivery_resolutions_delivery_id_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_resolutions" ADD CONSTRAINT "delivery_resolutions_target_storage_id_storages_id_fk" FOREIGN KEY ("target_storage_id") REFERENCES "public"."storages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_resolutions" ADD CONSTRAINT "delivery_resolutions_processed_by_user_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deliveries_order_id_idx" ON "deliveries" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "deliveries_status_idx" ON "deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "deliveries_delivered_at_idx" ON "deliveries" USING btree ("delivered_at");--> statement-breakpoint
CREATE INDEX "deliveries_tracking_number_idx" ON "deliveries" USING btree ("tracking_number");--> statement-breakpoint
CREATE INDEX "delivery_history_delivery_id_idx" ON "delivery_history" USING btree ("delivery_id");--> statement-breakpoint
CREATE INDEX "delivery_history_created_at_idx" ON "delivery_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "delivery_resolutions_delivery_id_idx" ON "delivery_resolutions" USING btree ("delivery_id");--> statement-breakpoint
CREATE INDEX "delivery_resolutions_type_idx" ON "delivery_resolutions" USING btree ("resolution_type");--> statement-breakpoint
CREATE INDEX "delivery_resolutions_status_idx" ON "delivery_resolutions" USING btree ("resolution_status");--> statement-breakpoint
CREATE INDEX "orders_delivery_status_idx" ON "orders" USING btree ("delivery_status");