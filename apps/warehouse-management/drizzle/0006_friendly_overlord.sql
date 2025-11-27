CREATE TABLE "sse_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"data" text,
	"counter" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "sse_events_created_at_idx" ON "sse_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sse_events_type_idx" ON "sse_events" USING btree ("type");