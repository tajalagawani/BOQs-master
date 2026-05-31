/**
 * Compliance types + clause list shared between the server comparator
 * (compliance-actions.ts) and the BoQ-viewer UI. Kept in its own
 * module so the "use server" file can stay function-only — Next.js
 * rejects const/type exports from server-action files.
 */

export type ComplianceVerdict =
  | "Compliant"
  | "Partial"
  | "Non-compliant"
  | "Missing"

export const FOT_COMPLIANCE_CLAUSES = [
  "FOT Submission",
  "Time for Completion",
  "OHP Markup",
  "Tender Validity",
  "Signatures",
] as const

export type FotComplianceClause = (typeof FOT_COMPLIANCE_CLAUSES)[number]

export type FotComplianceResult = Record<FotComplianceClause, ComplianceVerdict>
