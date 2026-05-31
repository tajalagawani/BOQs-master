CREATE TYPE "public"."tender_event_kind" AS ENUM('created', 'quantity_changed', 'description_changed', 'unit_changed', 'priced', 'withdrawn', 'note');--> statement-breakpoint
CREATE TYPE "public"."tender_event_source_kind" AS ENUM('boq_import', 'pte_import', 'addendum', 'manual');--> statement-breakpoint
CREATE TYPE "public"."tender_event_target_kind" AS ENUM('boq_item', 'project_field', 'project_phase', 'responsibility_matrix_row', 'compliance_record_template', 'spec_section');--> statement-breakpoint
CREATE TABLE "px_tender_item_event" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"item_id" text,
	"target_kind" "tender_event_target_kind" DEFAULT 'boq_item' NOT NULL,
	"target_ref" jsonb,
	"event_kind" "tender_event_kind" NOT NULL,
	"source_kind" "tender_event_source_kind" NOT NULL,
	"source_id" text,
	"payload" jsonb,
	"effective_at" timestamp DEFAULT now() NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"recorded_by_user_id" text
);
--> statement-breakpoint
ALTER TABLE "px_tender_item_event" ADD CONSTRAINT "px_tender_item_event_project_id_px_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."px_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_tender_item_event" ADD CONSTRAINT "px_tender_item_event_item_id_px_boq_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."px_boq_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_tender_item_event" ADD CONSTRAINT "px_tender_item_event_recorded_by_user_id_px_user_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."px_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tender_item_event_project_item_idx" ON "px_tender_item_event" USING btree ("project_id","item_id","recorded_at");--> statement-breakpoint
CREATE INDEX "tender_item_event_source_idx" ON "px_tender_item_event" USING btree ("source_kind","source_id");--> statement-breakpoint
CREATE INDEX "tender_item_event_kind_idx" ON "px_tender_item_event" USING btree ("event_kind");