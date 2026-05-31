CREATE TYPE "public"."workspace_role" AS ENUM('owner', 'admin', 'member', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('pending', 'uploaded', 'scanned', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('in_app', 'email');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'read', 'failed');--> statement-breakpoint
CREATE TYPE "public"."workflow_run_status" AS ENUM('queued', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."boq_priceset_owner_kind" AS ENUM('submission', 'estimate', 'baseline');--> statement-breakpoint
CREATE TYPE "public"."boq_pricing_mode" AS ENUM('measured', 'general_req');--> statement-breakpoint
CREATE TYPE "public"."boq_template_owner_kind" AS ENUM('project', 'workspace');--> statement-breakpoint
CREATE TYPE "public"."analysis_context" AS ENUM('ptc', 'tender', 'internal');--> statement-breakpoint
CREATE TYPE "public"."baseline_kind" AS ENUM('avg_lowest_three', 'median', 'average', 'reference');--> statement-breakpoint
CREATE TYPE "public"."flag_kind" AS ENUM('high_rate', 'low_rate', 'unpriced', 'arithmetical_error');--> statement-breakpoint
CREATE TYPE "public"."flag_status" AS ENUM('open', 'answered', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."tender_deviation_kind" AS ENUM('commercial', 'technical', 'contractual');--> statement-breakpoint
CREATE TYPE "public"."tender_flag_kind" AS ENUM('variance', 'high_rate', 'low_rate', 'unpriced', 'arithmetical_error');--> statement-breakpoint
CREATE TYPE "public"."unpriced_strategy" AS ENUM('list_only', 'avg_lowest_three', 'normalise_avg', 'normalise_pte');--> statement-breakpoint
CREATE TYPE "public"."report_artefact_status" AS ENUM('queued', 'rendering', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."extraction_job_status" AS ENUM('queued', 'claimed', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."project_role" AS ENUM('owner', 'qs', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('draft', 'configured', 'analysing', 'review', 'reported', 'archived');--> statement-breakpoint
CREATE TYPE "public"."round_key" AS ENUM('initial', 'ptc1', 'ptc2', 'ptc3');--> statement-breakpoint
CREATE TYPE "public"."round_status" AS ENUM('open', 'analysing', 'review', 'issued', 'locked');--> statement-breakpoint
CREATE TYPE "public"."compliance_status" AS ENUM('compliant', 'partial', 'non_compliant', 'missing');--> statement-breakpoint
CREATE TYPE "public"."deviation_kind" AS ENUM('contractual', 'commercial', 'technical');--> statement-breakpoint
CREATE TYPE "public"."deviation_status" AS ENUM('open', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."ptc_pack_status" AS ENUM('draft', 'issued', 'responded');--> statement-breakpoint
CREATE TYPE "public"."qualification_status" AS ENUM('claimed', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."tender_report_scope" AS ENUM('executive', 'full');--> statement-breakpoint
CREATE TYPE "public"."spec_discipline" AS ENUM('architectural', 'landscape', 'structural', 'mep', 'civil', 'combined');--> statement-breakpoint
CREATE TYPE "public"."spec_format" AS ENUM('csi-masterformat', 'nbs', 'bespoke');--> statement-breakpoint
CREATE TYPE "public"."tenderer_status" AS ENUM('pending', 'invited', 'opened', 'submitted', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."tender_addendum_file_kind" AS ENUM('cover', 'boq_full', 'boq_sheet', 'sopr_supplement', 'spec', 'drawing_ref', 'qa_attachment', 'screenshot', 'password', 'other');--> statement-breakpoint
CREATE TYPE "public"."tender_addendum_status" AS ENUM('parsed', 'applied', 'withdrawn');--> statement-breakpoint
CREATE TABLE "px_account" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "px_account_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "px_session" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "px_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp,
	"image" text,
	"password_hash" text,
	"is_dev_seed" boolean DEFAULT false NOT NULL,
	"dev_role_label" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "px_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "px_verification_token" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "px_verification_token_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "px_workspace_member" (
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "workspace_role" DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "px_workspace_member_workspace_id_user_id_pk" PRIMARY KEY("workspace_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "px_workspace" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by_user_id" text NOT NULL,
	CONSTRAINT "px_workspace_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "px_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text,
	"project_id" text,
	"actor_user_id" text,
	"actor_kind" text DEFAULT 'user' NOT NULL,
	"action" text NOT NULL,
	"target_kind" text NOT NULL,
	"target_id" text,
	"payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "px_company" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"trade_name" text,
	"country" text,
	"city" text,
	"trade" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "px_company_contact" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"role" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "px_document" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"project_id" text,
	"target_kind" text NOT NULL,
	"target_id" text NOT NULL,
	"scope" text NOT NULL,
	"category" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text,
	"size_bytes" bigint,
	"blob_pathname" text NOT NULL,
	"blob_url" text,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "document_status" DEFAULT 'pending' NOT NULL,
	"uploaded_by_user_id" text,
	"uploaded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "px_comment" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"project_id" text,
	"target_kind" text NOT NULL,
	"target_id" text NOT NULL,
	"parent_comment_id" text,
	"body_md" text NOT NULL,
	"attachments" jsonb,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "px_notification" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"project_id" text,
	"kind" text NOT NULL,
	"payload" jsonb,
	"channel" "notification_channel" DEFAULT 'in_app' NOT NULL,
	"status" "notification_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"sent_at" timestamp,
	"read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "px_workflow_run" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text,
	"project_id" text,
	"kind" text NOT NULL,
	"status" "workflow_run_status" DEFAULT 'queued' NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"error" text,
	"started_at" timestamp,
	"finished_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "px_boq_item_rate" (
	"id" text PRIMARY KEY NOT NULL,
	"priceset_id" text NOT NULL,
	"item_id" text NOT NULL,
	"unit_rate_cents" bigint,
	"amount_cents" bigint,
	"is_unpriced" boolean DEFAULT false NOT NULL,
	"is_arithmetical_error" boolean DEFAULT false NOT NULL,
	"normalised_rate_cents" bigint
);
--> statement-breakpoint
CREATE TABLE "px_boq_item" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"section_id" text NOT NULL,
	"no" text NOT NULL,
	"label" text NOT NULL,
	"unit" text,
	"quantity_planned" numeric,
	"notes" text,
	"entity_origin_event_id" text
);
--> statement-breakpoint
CREATE TABLE "px_boq_priceset" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"owner_kind" "boq_priceset_owner_kind" NOT NULL,
	"owner_id" text NOT NULL,
	"label" text NOT NULL,
	"currency" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "px_boq_section" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"no" text NOT NULL,
	"label" text NOT NULL,
	"pricing_mode" "boq_pricing_mode" DEFAULT 'measured' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "px_boq_template" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"owner_kind" "boq_template_owner_kind" NOT NULL,
	"owner_id" text NOT NULL,
	"currency" text,
	"source_document_id" text,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "px_analysis_config" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_kind" text NOT NULL,
	"owner_id" text NOT NULL,
	"context" "analysis_context" NOT NULL,
	"baseline_kind" "baseline_kind" DEFAULT 'avg_lowest_three' NOT NULL,
	"reference_priceset_id" text,
	"high_threshold_pct" numeric,
	"low_threshold_pct" numeric,
	"high_threshold_enabled" boolean DEFAULT true NOT NULL,
	"low_threshold_enabled" boolean DEFAULT true NOT NULL,
	"unpriced_strategy" "unpriced_strategy" DEFAULT 'list_only',
	"unpriced_quality_check_enabled" boolean DEFAULT false NOT NULL,
	"unpriced_quality_check_pct" numeric,
	"sections_enabled" jsonb,
	"updated_by_user_id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "px_flag" (
	"id" text PRIMARY KEY NOT NULL,
	"priceset_id" text NOT NULL,
	"item_rate_id" text NOT NULL,
	"kind" "flag_kind" NOT NULL,
	"baseline_rate_cents" bigint,
	"baseline_kind" "baseline_kind",
	"variance_pct" numeric,
	"qs_question" text,
	"qs_note" text,
	"include_in_output" boolean DEFAULT true NOT NULL,
	"response" text,
	"status" "flag_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "px_tender_deviation" (
	"id" text PRIMARY KEY NOT NULL,
	"tenderer_id" text NOT NULL,
	"submission_id" text,
	"document_id" text,
	"kind" "tender_deviation_kind" NOT NULL,
	"clause" text NOT NULL,
	"snippet" text,
	"severity" text DEFAULT 'minor' NOT NULL,
	"agent_run_id" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "px_tender_flag" (
	"id" text PRIMARY KEY NOT NULL,
	"tenderer_id" text NOT NULL,
	"submission_id" text NOT NULL,
	"item_id" text,
	"kind" "tender_flag_kind" NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"baseline_mode" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "px_tender_review_row" (
	"id" text PRIMARY KEY NOT NULL,
	"tenderer_id" text NOT NULL,
	"section_key" text NOT NULL,
	"qs_comment" text,
	"include_in_ptc" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by_user_id" text
);
--> statement-breakpoint
CREATE TABLE "px_tenderer_submission" (
	"id" text PRIMARY KEY NOT NULL,
	"round_id" text NOT NULL,
	"tenderer_id" text NOT NULL,
	"source_document_id" text,
	"tender_sum_cents" bigint,
	"adjusted_sum_cents" bigint,
	"variance_pct" numeric,
	"priced_items" numeric DEFAULT '0',
	"unpriced_items" numeric DEFAULT '0',
	"arithmetical_errors" numeric DEFAULT '0',
	"high_rates_count" numeric DEFAULT '0',
	"low_rates_count" numeric DEFAULT '0',
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"submitted_at" timestamp,
	"analysed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "px_report_artefact" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"project_id" text,
	"kind" text NOT NULL,
	"scope" jsonb,
	"template_key" text NOT NULL,
	"blob_url" text,
	"blob_pathname" text,
	"mime_type" text,
	"status" "report_artefact_status" DEFAULT 'queued' NOT NULL,
	"error" text,
	"generated_at" timestamp,
	"generated_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "px_extraction_job" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"project_id" text,
	"document_id" text NOT NULL,
	"status" "extraction_job_status" DEFAULT 'queued' NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"payload" jsonb NOT NULL,
	"claimed_by" text,
	"claimed_at" timestamp,
	"workflow_run_id" text,
	"last_error" text,
	"progress" jsonb,
	"started_at" timestamp,
	"finished_at" timestamp,
	"next_attempt_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "px_project_member" (
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "project_role" DEFAULT 'qs' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "px_project_member_project_id_user_id_pk" PRIMARY KEY("project_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "px_project" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"status" "project_status" DEFAULT 'draft' NOT NULL,
	"currency" text,
	"city" text,
	"country" text,
	"project_type" text,
	"basis_of_tender" text,
	"conditions_of_contract" text,
	"gfa" numeric,
	"bua" numeric,
	"budget_cents" bigint,
	"project_lead_user_id" text,
	"procurement_lead_user_id" text,
	"tender_coordinator_user_id" text,
	"tender_issued_at" date,
	"original_return_at" date,
	"adjusted_return_at" date,
	"required_validity_days" integer,
	"itt_addenda_cutoff_days" integer,
	"itt_clarification_cutoff_days" integer,
	"vat_treatment" text,
	"engineer_name" text,
	"document_priority_order" jsonb,
	"approved_bond_banks" jsonb,
	"alternative_tender_allowed" boolean DEFAULT false NOT NULL,
	"rera_trust_account_required" boolean DEFAULT false NOT NULL,
	"language" text DEFAULT 'English',
	"contract_form" text,
	"contract_form_code" text,
	"contract_form_version" text,
	"contract_sum_cents" bigint,
	"governing_law" text,
	"dispute_forum" text,
	"advance_payment_percent" numeric,
	"advance_payment_bond_percent" numeric,
	"performance_bond_percent" numeric,
	"performance_bond_required" boolean,
	"retention_percent" numeric,
	"retention_cap_cents" bigint,
	"retention_cap_percent" numeric,
	"ld_per_day_cents" bigint,
	"ld_cap_cents" bigint,
	"ld_cap_percent" numeric,
	"dlp_months" integer,
	"decennial_liability_years" integer,
	"fixed_price" boolean,
	"insurance_minimums" jsonb,
	"working_hours" jsonb,
	"site_conditions" jsonb,
	"material_standards_required" jsonb,
	"bim_requirements" jsonb,
	"earned_value_config" jsonb,
	"hse_requirements" jsonb,
	"sustainability_config" jsonb,
	"master_community_policy" jsonb,
	"security_requirements" jsonb,
	"reporting_frequency" text,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "px_revision" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"label" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "px_round" (
	"id" text PRIMARY KEY NOT NULL,
	"revision_id" text NOT NULL,
	"key" "round_key" NOT NULL,
	"label" text NOT NULL,
	"status" "round_status" DEFAULT 'open' NOT NULL,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"issued_at" timestamp,
	"locked_at" timestamp,
	"signed_off_by_user_id" text,
	"signed_off_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "px_round_config_ref" (
	"id" text PRIMARY KEY NOT NULL,
	"round_id" text NOT NULL,
	"context" "analysis_context" NOT NULL,
	"config_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "px_compliance_record" (
	"id" text PRIMARY KEY NOT NULL,
	"submission_id" text NOT NULL,
	"section_code" text NOT NULL,
	"criterion_code" text NOT NULL,
	"criterion_label" text,
	"expected_value" jsonb,
	"actual_value" jsonb,
	"status" "compliance_status" DEFAULT 'missing' NOT NULL,
	"qs_comment" text,
	"include_in_ptc" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "px_deviation" (
	"id" text PRIMARY KEY NOT NULL,
	"submission_id" text NOT NULL,
	"kind" "deviation_kind" NOT NULL,
	"ref" text,
	"summary" text NOT NULL,
	"detail" text,
	"impact_cents" bigint,
	"evidence_document_id" text,
	"qs_note" text,
	"include_in_ptc" boolean DEFAULT true NOT NULL,
	"status" "deviation_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "px_ptc_pack" (
	"id" text PRIMARY KEY NOT NULL,
	"round_id" text NOT NULL,
	"tenderer_id" text NOT NULL,
	"blob_url" text,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"generated_by_user_id" text,
	"status" "ptc_pack_status" DEFAULT 'draft' NOT NULL,
	"issued_at" timestamp,
	"responded_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "px_qualification" (
	"id" text PRIMARY KEY NOT NULL,
	"submission_id" text NOT NULL,
	"label" text NOT NULL,
	"evidence_document_id" text,
	"status" "qualification_status" DEFAULT 'claimed' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "px_tender_report" (
	"id" text PRIMARY KEY NOT NULL,
	"round_id" text NOT NULL,
	"scope" "tender_report_scope" NOT NULL,
	"include_appendices" boolean DEFAULT true NOT NULL,
	"blob_url" text,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"generated_by_user_id" text
);
--> statement-breakpoint
CREATE TABLE "px_tenderer_invite" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"company_id" text NOT NULL,
	"magic_token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"sent_by_user_id" text,
	"opened_at" timestamp,
	"accepted_at" timestamp,
	"resent_count" integer DEFAULT 0 NOT NULL,
	"revoked_at" timestamp,
	CONSTRAINT "px_tenderer_invite_magic_token_hash_unique" UNIQUE("magic_token_hash")
);
--> statement-breakpoint
CREATE TABLE "px_specification_approved_manufacturer" (
	"id" text PRIMARY KEY NOT NULL,
	"spec_doc_id" text NOT NULL,
	"section_code" text,
	"product" text NOT NULL,
	"manufacturer" text NOT NULL,
	"model" text,
	"country_of_origin" text,
	"alternatives" jsonb
);
--> statement-breakpoint
CREATE TABLE "px_specification_doc" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"document_id" text,
	"discipline" "spec_discipline" NOT NULL,
	"author" text,
	"issued_at" text,
	"version" text,
	"format" "spec_format" DEFAULT 'csi-masterformat' NOT NULL,
	"project_code" text,
	"sections_total" integer,
	"divisions_used" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "px_specification_section" (
	"id" text PRIMARY KEY NOT NULL,
	"spec_doc_id" text NOT NULL,
	"csi_code" text NOT NULL,
	"csi_division" text NOT NULL,
	"title" text NOT NULL,
	"page_count" integer,
	"references" jsonb,
	"related_sections" jsonb,
	"submittals" jsonb,
	"warranty" jsonb,
	"part1_text" text,
	"part2_text" text,
	"part3_text" text
);
--> statement-breakpoint
CREATE TABLE "px_compliance_record_template" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"section_code" text NOT NULL,
	"criterion_code" text NOT NULL,
	"criterion_label" text NOT NULL,
	"expected_value" jsonb,
	"source_ref" text,
	"submission_mandatory" boolean DEFAULT true NOT NULL,
	"submission_window" text,
	"format_required" text,
	"acceptance_criterion" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "px_project_close_out_item" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"appendix_ref" text,
	"item_id" text NOT NULL,
	"label" text NOT NULL,
	"format" text,
	"submission_window_days" integer,
	"acceptance_criterion" text,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "px_project_phase" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"phase_id" text NOT NULL,
	"name" text NOT NULL,
	"start_milestone" text,
	"finish_milestone" text,
	"plots_covered" jsonb,
	"access_constraints" jsonb,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "px_responsibility_matrix_row" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"category" text NOT NULL,
	"ref" text NOT NULL,
	"item_label" text NOT NULL,
	"responsible_by" jsonb NOT NULL,
	"pricing_note" text,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "px_tenderer" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"company_id" text NOT NULL,
	"code" text NOT NULL,
	"contact_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text,
	"status" "tenderer_status" DEFAULT 'pending' NOT NULL,
	"invited_at" timestamp,
	"invited_by_user_id" text,
	"submitted_at" timestamp,
	"withdrawn_at" timestamp,
	"qs_upload" boolean DEFAULT false NOT NULL,
	"rank_initial" integer,
	"rank_current" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "px_tender_addendum" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"no" text NOT NULL,
	"issued_at" date,
	"status" "tender_addendum_status" DEFAULT 'parsed' NOT NULL,
	"cover_file_id" text,
	"intro_text" text,
	"scope_summary" jsonb,
	"source_zip_filename" text,
	"source_zip_sha256" text,
	"source_document_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"applied_at" timestamp,
	"applied_by_user_id" text
);
--> statement-breakpoint
CREATE TABLE "px_tender_addendum_file" (
	"id" text PRIMARY KEY NOT NULL,
	"addendum_id" text NOT NULL,
	"kind" "tender_addendum_file_kind" NOT NULL,
	"filename" text NOT NULL,
	"relative_path" text NOT NULL,
	"blob_url" text,
	"size_bytes" bigint,
	"sha256" text,
	"is_drawing" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "px_tender_addendum_query" (
	"id" text PRIMARY KEY NOT NULL,
	"addendum_id" text NOT NULL,
	"query_no" text NOT NULL,
	"query_text" text NOT NULL,
	"reference_raw" text,
	"reference_parsed" jsonb,
	"resolved_item_id" text,
	"response_text" text,
	"derived_events" jsonb,
	"applied" boolean DEFAULT false NOT NULL,
	"applied_at" timestamp,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "px_account" ADD CONSTRAINT "px_account_user_id_px_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."px_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_session" ADD CONSTRAINT "px_session_user_id_px_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."px_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_workspace_member" ADD CONSTRAINT "px_workspace_member_workspace_id_px_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."px_workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_workspace_member" ADD CONSTRAINT "px_workspace_member_user_id_px_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."px_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_workspace" ADD CONSTRAINT "px_workspace_created_by_user_id_px_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."px_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_audit_log" ADD CONSTRAINT "px_audit_log_workspace_id_px_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."px_workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_audit_log" ADD CONSTRAINT "px_audit_log_actor_user_id_px_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."px_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_company" ADD CONSTRAINT "px_company_workspace_id_px_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."px_workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_company" ADD CONSTRAINT "px_company_created_by_user_id_px_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."px_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_company_contact" ADD CONSTRAINT "px_company_contact_company_id_px_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."px_company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_document" ADD CONSTRAINT "px_document_workspace_id_px_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."px_workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_document" ADD CONSTRAINT "px_document_uploaded_by_user_id_px_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."px_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_comment" ADD CONSTRAINT "px_comment_workspace_id_px_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."px_workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_comment" ADD CONSTRAINT "px_comment_created_by_user_id_px_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."px_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_notification" ADD CONSTRAINT "px_notification_user_id_px_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."px_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_notification" ADD CONSTRAINT "px_notification_workspace_id_px_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."px_workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_workflow_run" ADD CONSTRAINT "px_workflow_run_workspace_id_px_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."px_workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_boq_item_rate" ADD CONSTRAINT "px_boq_item_rate_priceset_id_px_boq_priceset_id_fk" FOREIGN KEY ("priceset_id") REFERENCES "public"."px_boq_priceset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_boq_item_rate" ADD CONSTRAINT "px_boq_item_rate_item_id_px_boq_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."px_boq_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_boq_item" ADD CONSTRAINT "px_boq_item_template_id_px_boq_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."px_boq_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_boq_item" ADD CONSTRAINT "px_boq_item_section_id_px_boq_section_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."px_boq_section"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_boq_priceset" ADD CONSTRAINT "px_boq_priceset_template_id_px_boq_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."px_boq_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_boq_section" ADD CONSTRAINT "px_boq_section_template_id_px_boq_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."px_boq_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_boq_template" ADD CONSTRAINT "px_boq_template_workspace_id_px_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."px_workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_boq_template" ADD CONSTRAINT "px_boq_template_source_document_id_px_document_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."px_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_boq_template" ADD CONSTRAINT "px_boq_template_created_by_user_id_px_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."px_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_analysis_config" ADD CONSTRAINT "px_analysis_config_reference_priceset_id_px_boq_priceset_id_fk" FOREIGN KEY ("reference_priceset_id") REFERENCES "public"."px_boq_priceset"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_analysis_config" ADD CONSTRAINT "px_analysis_config_updated_by_user_id_px_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."px_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_flag" ADD CONSTRAINT "px_flag_priceset_id_px_boq_priceset_id_fk" FOREIGN KEY ("priceset_id") REFERENCES "public"."px_boq_priceset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_flag" ADD CONSTRAINT "px_flag_item_rate_id_px_boq_item_rate_id_fk" FOREIGN KEY ("item_rate_id") REFERENCES "public"."px_boq_item_rate"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_report_artefact" ADD CONSTRAINT "px_report_artefact_workspace_id_px_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."px_workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_report_artefact" ADD CONSTRAINT "px_report_artefact_generated_by_user_id_px_user_id_fk" FOREIGN KEY ("generated_by_user_id") REFERENCES "public"."px_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_extraction_job" ADD CONSTRAINT "px_extraction_job_workspace_id_px_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."px_workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_extraction_job" ADD CONSTRAINT "px_extraction_job_document_id_px_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."px_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_project_member" ADD CONSTRAINT "px_project_member_project_id_px_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."px_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_project_member" ADD CONSTRAINT "px_project_member_user_id_px_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."px_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_project" ADD CONSTRAINT "px_project_workspace_id_px_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."px_workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_project" ADD CONSTRAINT "px_project_project_lead_user_id_px_user_id_fk" FOREIGN KEY ("project_lead_user_id") REFERENCES "public"."px_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_project" ADD CONSTRAINT "px_project_procurement_lead_user_id_px_user_id_fk" FOREIGN KEY ("procurement_lead_user_id") REFERENCES "public"."px_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_project" ADD CONSTRAINT "px_project_tender_coordinator_user_id_px_user_id_fk" FOREIGN KEY ("tender_coordinator_user_id") REFERENCES "public"."px_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_project" ADD CONSTRAINT "px_project_created_by_user_id_px_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."px_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_revision" ADD CONSTRAINT "px_revision_project_id_px_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."px_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_round" ADD CONSTRAINT "px_round_revision_id_px_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."px_revision"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_round" ADD CONSTRAINT "px_round_signed_off_by_user_id_px_user_id_fk" FOREIGN KEY ("signed_off_by_user_id") REFERENCES "public"."px_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_round_config_ref" ADD CONSTRAINT "px_round_config_ref_round_id_px_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."px_round"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_round_config_ref" ADD CONSTRAINT "px_round_config_ref_config_id_px_analysis_config_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."px_analysis_config"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_compliance_record" ADD CONSTRAINT "px_compliance_record_submission_id_px_tenderer_submission_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."px_tenderer_submission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_deviation" ADD CONSTRAINT "px_deviation_submission_id_px_tenderer_submission_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."px_tenderer_submission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_ptc_pack" ADD CONSTRAINT "px_ptc_pack_round_id_px_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."px_round"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_ptc_pack" ADD CONSTRAINT "px_ptc_pack_generated_by_user_id_px_user_id_fk" FOREIGN KEY ("generated_by_user_id") REFERENCES "public"."px_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_qualification" ADD CONSTRAINT "px_qualification_submission_id_px_tenderer_submission_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."px_tenderer_submission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_tender_report" ADD CONSTRAINT "px_tender_report_round_id_px_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."px_round"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_tender_report" ADD CONSTRAINT "px_tender_report_generated_by_user_id_px_user_id_fk" FOREIGN KEY ("generated_by_user_id") REFERENCES "public"."px_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_tenderer_invite" ADD CONSTRAINT "px_tenderer_invite_project_id_px_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."px_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_tenderer_invite" ADD CONSTRAINT "px_tenderer_invite_company_id_px_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."px_company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_tenderer_invite" ADD CONSTRAINT "px_tenderer_invite_sent_by_user_id_px_user_id_fk" FOREIGN KEY ("sent_by_user_id") REFERENCES "public"."px_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_specification_approved_manufacturer" ADD CONSTRAINT "px_specification_approved_manufacturer_spec_doc_id_px_specification_doc_id_fk" FOREIGN KEY ("spec_doc_id") REFERENCES "public"."px_specification_doc"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_specification_doc" ADD CONSTRAINT "px_specification_doc_project_id_px_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."px_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_specification_section" ADD CONSTRAINT "px_specification_section_spec_doc_id_px_specification_doc_id_fk" FOREIGN KEY ("spec_doc_id") REFERENCES "public"."px_specification_doc"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_compliance_record_template" ADD CONSTRAINT "px_compliance_record_template_project_id_px_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."px_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_project_close_out_item" ADD CONSTRAINT "px_project_close_out_item_project_id_px_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."px_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_project_phase" ADD CONSTRAINT "px_project_phase_project_id_px_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."px_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_responsibility_matrix_row" ADD CONSTRAINT "px_responsibility_matrix_row_project_id_px_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."px_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_tenderer" ADD CONSTRAINT "px_tenderer_project_id_px_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."px_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_tenderer" ADD CONSTRAINT "px_tenderer_company_id_px_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."px_company"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_tenderer" ADD CONSTRAINT "px_tenderer_invited_by_user_id_px_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."px_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_tender_addendum" ADD CONSTRAINT "px_tender_addendum_project_id_px_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."px_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_tender_addendum" ADD CONSTRAINT "px_tender_addendum_source_document_id_px_document_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."px_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_tender_addendum" ADD CONSTRAINT "px_tender_addendum_applied_by_user_id_px_user_id_fk" FOREIGN KEY ("applied_by_user_id") REFERENCES "public"."px_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_tender_addendum_file" ADD CONSTRAINT "px_tender_addendum_file_addendum_id_px_tender_addendum_id_fk" FOREIGN KEY ("addendum_id") REFERENCES "public"."px_tender_addendum"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_tender_addendum_query" ADD CONSTRAINT "px_tender_addendum_query_addendum_id_px_tender_addendum_id_fk" FOREIGN KEY ("addendum_id") REFERENCES "public"."px_tender_addendum"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "px_tender_addendum_query" ADD CONSTRAINT "px_tender_addendum_query_resolved_item_id_px_boq_item_id_fk" FOREIGN KEY ("resolved_item_id") REFERENCES "public"."px_boq_item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_member_user_idx" ON "px_workspace_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_workspace_idx" ON "px_audit_log" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_project_idx" ON "px_audit_log" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_target_idx" ON "px_audit_log" USING btree ("target_kind","target_id");--> statement-breakpoint
CREATE INDEX "company_workspace_idx" ON "px_company" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "company_contact_company_idx" ON "px_company_contact" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_contact_company_email_uq" ON "px_company_contact" USING btree ("company_id","email");--> statement-breakpoint
CREATE INDEX "document_workspace_idx" ON "px_document" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "document_project_idx" ON "px_document" USING btree ("project_id","scope");--> statement-breakpoint
CREATE INDEX "document_target_idx" ON "px_document" USING btree ("target_kind","target_id");--> statement-breakpoint
CREATE INDEX "comment_workspace_idx" ON "px_comment" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "comment_target_idx" ON "px_comment" USING btree ("target_kind","target_id","created_at");--> statement-breakpoint
CREATE INDEX "comment_parent_idx" ON "px_comment" USING btree ("parent_comment_id");--> statement-breakpoint
CREATE INDEX "notification_user_idx" ON "px_notification" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notification_workspace_idx" ON "px_notification" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "notification_unread_idx" ON "px_notification" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "workflow_run_kind_idx" ON "px_workflow_run" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "workflow_run_project_idx" ON "px_workflow_run" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "workflow_run_status_idx" ON "px_workflow_run" USING btree ("status");--> statement-breakpoint
CREATE INDEX "boq_item_rate_priceset_idx" ON "px_boq_item_rate" USING btree ("priceset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "boq_item_rate_priceset_item_uq" ON "px_boq_item_rate" USING btree ("priceset_id","item_id");--> statement-breakpoint
CREATE INDEX "boq_item_template_idx" ON "px_boq_item" USING btree ("template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "boq_item_template_no_uq" ON "px_boq_item" USING btree ("template_id","no");--> statement-breakpoint
CREATE INDEX "boq_priceset_owner_idx" ON "px_boq_priceset" USING btree ("owner_kind","owner_id");--> statement-breakpoint
CREATE INDEX "boq_priceset_template_idx" ON "px_boq_priceset" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "boq_section_template_idx" ON "px_boq_section" USING btree ("template_id","position");--> statement-breakpoint
CREATE INDEX "boq_template_owner_idx" ON "px_boq_template" USING btree ("owner_kind","owner_id");--> statement-breakpoint
CREATE INDEX "boq_template_source_doc_idx" ON "px_boq_template" USING btree ("source_document_id");--> statement-breakpoint
CREATE INDEX "analysis_config_owner_idx" ON "px_analysis_config" USING btree ("owner_kind","owner_id");--> statement-breakpoint
CREATE INDEX "flag_priceset_idx" ON "px_flag" USING btree ("priceset_id");--> statement-breakpoint
CREATE INDEX "flag_priceset_kind_idx" ON "px_flag" USING btree ("priceset_id","kind");--> statement-breakpoint
CREATE INDEX "flag_status_idx" ON "px_flag" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tender_deviation_tenderer_idx" ON "px_tender_deviation" USING btree ("tenderer_id");--> statement-breakpoint
CREATE INDEX "tender_deviation_document_idx" ON "px_tender_deviation" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "tender_deviation_kind_idx" ON "px_tender_deviation" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "tender_flag_tenderer_idx" ON "px_tender_flag" USING btree ("tenderer_id");--> statement-breakpoint
CREATE INDEX "tender_flag_submission_idx" ON "px_tender_flag" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "tender_flag_kind_idx" ON "px_tender_flag" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "tender_review_row_tenderer_idx" ON "px_tender_review_row" USING btree ("tenderer_id");--> statement-breakpoint
CREATE INDEX "tender_review_row_section_idx" ON "px_tender_review_row" USING btree ("section_key");--> statement-breakpoint
CREATE INDEX "submission_round_idx" ON "px_tenderer_submission" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "submission_tenderer_idx" ON "px_tenderer_submission" USING btree ("tenderer_id");--> statement-breakpoint
CREATE INDEX "report_workspace_idx" ON "px_report_artefact" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "report_project_idx" ON "px_report_artefact" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "report_kind_idx" ON "px_report_artefact" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "extraction_job_status_idx" ON "px_extraction_job" USING btree ("status","priority","created_at");--> statement-breakpoint
CREATE INDEX "extraction_job_document_idx" ON "px_extraction_job" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "extraction_job_workspace_idx" ON "px_extraction_job" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "extraction_job_next_attempt_idx" ON "px_extraction_job" USING btree ("next_attempt_at");--> statement-breakpoint
CREATE INDEX "project_member_user_idx" ON "px_project_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "project_workspace_idx" ON "px_project" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "project_status_idx" ON "px_project" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "revision_project_idx" ON "px_revision" USING btree ("project_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "revision_project_position_uq" ON "px_revision" USING btree ("project_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "round_revision_key_uq" ON "px_round" USING btree ("revision_id","key");--> statement-breakpoint
CREATE INDEX "round_status_idx" ON "px_round" USING btree ("status");--> statement-breakpoint
CREATE INDEX "round_config_round_idx" ON "px_round_config_ref" USING btree ("round_id");--> statement-breakpoint
CREATE UNIQUE INDEX "round_config_round_context_uq" ON "px_round_config_ref" USING btree ("round_id","context");--> statement-breakpoint
CREATE INDEX "compliance_submission_idx" ON "px_compliance_record" USING btree ("submission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "compliance_submission_section_criterion_uq" ON "px_compliance_record" USING btree ("submission_id","section_code","criterion_code");--> statement-breakpoint
CREATE INDEX "deviation_submission_idx" ON "px_deviation" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "deviation_kind_idx" ON "px_deviation" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "ptc_pack_round_idx" ON "px_ptc_pack" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "ptc_pack_tenderer_idx" ON "px_ptc_pack" USING btree ("tenderer_id");--> statement-breakpoint
CREATE INDEX "qualification_submission_idx" ON "px_qualification" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "tender_report_round_idx" ON "px_tender_report" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "invite_project_idx" ON "px_tenderer_invite" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invite_project_company_uq" ON "px_tenderer_invite" USING btree ("project_id","company_id");--> statement-breakpoint
CREATE INDEX "spec_mfr_doc_idx" ON "px_specification_approved_manufacturer" USING btree ("spec_doc_id");--> statement-breakpoint
CREATE INDEX "spec_doc_project_idx" ON "px_specification_doc" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "spec_section_doc_idx" ON "px_specification_section" USING btree ("spec_doc_id","csi_code");--> statement-breakpoint
CREATE INDEX "compliance_template_project_idx" ON "px_compliance_record_template" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "compliance_template_section_idx" ON "px_compliance_record_template" USING btree ("project_id","section_code");--> statement-breakpoint
CREATE INDEX "closeout_project_idx" ON "px_project_close_out_item" USING btree ("project_id","position");--> statement-breakpoint
CREATE INDEX "project_phase_project_idx" ON "px_project_phase" USING btree ("project_id","position");--> statement-breakpoint
CREATE INDEX "resp_matrix_project_idx" ON "px_responsibility_matrix_row" USING btree ("project_id","position");--> statement-breakpoint
CREATE INDEX "resp_matrix_category_idx" ON "px_responsibility_matrix_row" USING btree ("category");--> statement-breakpoint
CREATE INDEX "tenderer_project_idx" ON "px_tenderer" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tenderer_project_code_uq" ON "px_tenderer" USING btree ("project_id","code") WHERE "px_tenderer"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "tenderer_project_company_uq" ON "px_tenderer" USING btree ("project_id","company_id") WHERE "px_tenderer"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "tender_addendum_project_idx" ON "px_tender_addendum" USING btree ("project_id","issued_at");--> statement-breakpoint
CREATE INDEX "tender_addendum_file_addendum_idx" ON "px_tender_addendum_file" USING btree ("addendum_id","position");--> statement-breakpoint
CREATE INDEX "tender_addendum_query_addendum_idx" ON "px_tender_addendum_query" USING btree ("addendum_id","position");