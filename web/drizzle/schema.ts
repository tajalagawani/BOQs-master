// Aggregate every module's schema here so drizzle-kit picks them all up.
// Each module owns its own schema file; this barrel just re-exports.

// Foundation
export * from "@/modules/identity/schema"
export * from "@/modules/workspace/schema"
export * from "@/modules/audit/schema"

// Shared infra
export * from "@/modules/companies/schema"
export * from "@/modules/documents/schema"
export * from "@/modules/comments/schema"
export * from "@/modules/notifications/schema"
export * from "@/modules/workflows/schema"

// Cost-modelling core
export * from "@/modules/boq/schema"
export * from "@/modules/analysis/schema"
export * from "@/modules/reports/schema"

// AI extraction queue
export * from "@/modules/ai-extraction/queue/schema"

// ProcureX-specific
export * from "@/modules/procurex/projects/schema"
export * from "@/modules/procurex/revisions/schema"
export * from "@/modules/procurex/config/schema"
export * from "@/modules/procurex/ptc/schema"
export * from "@/modules/procurex/portal/schema"
export * from "@/modules/procurex/specifications/schema"
export * from "@/modules/procurex/sopr/schema"
export * from "@/modules/procurex/tenderers/schema"
export * from "@/modules/procurex/addenda/schema"

// Ancillary schemas (lived outside the per-module schema.ts files in OmniApp)
export * from "@/modules/procurex/boq/events-schema"
