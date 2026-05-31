import { db } from "@/modules/core/db"

import { auditLog, type NewAuditLog } from "./schema"

export { auditLog } from "./schema"
export type { AuditLogRow, NewAuditLog } from "./schema"

/**
 * Append an audit-log row. Should be called from every mutation that
 * changes user-visible state. Never throws — audit failures must not
 * break the action.
 */
export async function recordAudit(event: NewAuditLog): Promise<void> {
  try {
    await db.insert(auditLog).values(event)
  } catch (err) {
    console.error("[audit] failed to record", err)
  }
}
