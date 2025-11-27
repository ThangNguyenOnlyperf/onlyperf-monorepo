CREATE TABLE "scanning_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"cart_items" text DEFAULT '[]' NOT NULL,
	"customer_info" text DEFAULT '{}' NOT NULL,
	"device_count" integer DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"last_ping" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scanning_sessions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "scanning_sessions" ADD CONSTRAINT "scanning_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scanning_sessions_user_id_idx" ON "scanning_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scanning_sessions_last_updated_idx" ON "scanning_sessions" USING btree ("last_updated");