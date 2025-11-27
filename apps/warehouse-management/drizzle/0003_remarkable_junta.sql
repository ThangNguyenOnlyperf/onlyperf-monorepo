CREATE TABLE "providers" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"tax_code" text,
	"address" text,
	"telephone" text NOT NULL,
	"account_no" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "provider_id" text;--> statement-breakpoint
CREATE INDEX "providers_type_idx" ON "providers" USING btree ("type");--> statement-breakpoint
CREATE INDEX "providers_name_idx" ON "providers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "providers_telephone_idx" ON "providers" USING btree ("telephone");--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shipments_provider_id_idx" ON "shipments" USING btree ("provider_id");