CREATE TABLE "checkout_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"payment_code" text NOT NULL,
	"cart_id" text NOT NULL,
	"lines_snapshot" jsonb NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'VND' NOT NULL,
	"email" text,
	"customer_id" text,
	"is_guest" boolean DEFAULT false NOT NULL,
	"guest_email" text,
	"guest_phone" text,
	"guest_first_name" text,
	"guest_last_name" text,
	"shipping_address" jsonb,
	"payment_method" text DEFAULT 'bank_transfer' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"shopify_order_id" text,
	"sepay_transaction_id" text,
	"expires_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sepay_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"sepay_transaction_id" text,
	"gateway" text NOT NULL,
	"transaction_date" timestamp with time zone NOT NULL,
	"account_number" text,
	"sub_account" text,
	"amount_in" text DEFAULT '0' NOT NULL,
	"amount_out" text DEFAULT '0' NOT NULL,
	"accumulated" text DEFAULT '0' NOT NULL,
	"code" text,
	"transaction_content" text,
	"reference_number" text,
	"body" text,
	"transfer_type" text NOT NULL,
	"transfer_amount" text NOT NULL,
	"order_id" text,
	"processed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sepay_transactions_sepay_transaction_id_unique" UNIQUE("sepay_transaction_id")
);
--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "shipment_item_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "qr_code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "payment_status" SET DEFAULT 'Unpaid';--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "fulfillment_status" text DEFAULT 'fulfilled' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "scanned_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "source" text DEFAULT 'in-store' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shopify_order_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shopify_order_number" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_code" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "fulfillment_status" text DEFAULT 'fulfilled' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_sessions_payment_code_idx" ON "checkout_sessions" USING btree ("payment_code");--> statement-breakpoint
CREATE INDEX "checkout_sessions_status_idx" ON "checkout_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "checkout_sessions_sepay_transaction_idx" ON "checkout_sessions" USING btree ("sepay_transaction_id");--> statement-breakpoint
CREATE INDEX "sepay_transactions_sepay_transaction_id_idx" ON "sepay_transactions" USING btree ("sepay_transaction_id");--> statement-breakpoint
CREATE INDEX "sepay_transactions_gateway_idx" ON "sepay_transactions" USING btree ("gateway");--> statement-breakpoint
CREATE INDEX "sepay_transactions_transaction_date_idx" ON "sepay_transactions" USING btree ("transaction_date");--> statement-breakpoint
CREATE INDEX "sepay_transactions_account_number_idx" ON "sepay_transactions" USING btree ("account_number");--> statement-breakpoint
CREATE INDEX "sepay_transactions_reference_number_idx" ON "sepay_transactions" USING btree ("reference_number");--> statement-breakpoint
CREATE INDEX "sepay_transactions_code_idx" ON "sepay_transactions" USING btree ("code");--> statement-breakpoint
CREATE INDEX "sepay_transactions_order_id_idx" ON "sepay_transactions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "sepay_transactions_processed_idx" ON "sepay_transactions" USING btree ("processed");--> statement-breakpoint
CREATE INDEX "sepay_transactions_transfer_type_idx" ON "sepay_transactions" USING btree ("transfer_type");--> statement-breakpoint
CREATE INDEX "order_items_fulfillment_status_idx" ON "order_items" USING btree ("fulfillment_status");--> statement-breakpoint
CREATE INDEX "orders_payment_code_idx" ON "orders" USING btree ("payment_code");--> statement-breakpoint
CREATE INDEX "orders_fulfillment_status_idx" ON "orders" USING btree ("fulfillment_status");--> statement-breakpoint
CREATE INDEX "orders_source_idx" ON "orders" USING btree ("source");--> statement-breakpoint
CREATE INDEX "orders_shopify_order_id_idx" ON "orders" USING btree ("shopify_order_id");