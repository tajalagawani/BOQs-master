import "server-only";

import { desc, sql } from "drizzle-orm";
import { prisma } from "@/lib/prisma";
import { db } from "@/modules/core/db";
import { auditLog as pxAuditLog } from "@/modules/audit/schema";

export type AuditModule = "IOX" | "ProcureX";

export interface AuditEvent {
  id: string;
  module: AuditModule;
  ts: string;
  actor: string;
  actorKind?: string;
  action: string;
  target: string;
  targetId?: string;
  payloadSummary?: string;
  ip?: string;
}

export interface AuditStats {
  total: number;
  iox: number;
  procurex: number;
  topActions: { action: string; count: number }[];
  topActors: { actor: string; count: number }[];
}

const MAX_EVENTS = 200;

/**
 * Union the two activity tables in the IOX database:
 *   - Prisma   `activity_logs`  (IOX modules — CostX, BOQs, etc.)
 *   - Drizzle  `px_audit_log`   (ProcureX module)
 *
 * Each row is normalised to a common shape and returned newest-first.
 * Caller may filter client-side; we cap at 200 rows server-side to
 * keep the page snappy.
 */
export async function listAuditEvents(): Promise<AuditEvent[]> {
  const [ioxRows, pxRows] = await Promise.all([
    prisma.activityLog
      .findMany({
        orderBy: { createdAt: "desc" },
        take: MAX_EVENTS,
        include: { user: { select: { email: true, name: true } } },
      })
      .catch(() => []),
    db
      .select({
        id: pxAuditLog.id,
        ts: pxAuditLog.createdAt,
        actorUserId: pxAuditLog.actorUserId,
        actorKind: pxAuditLog.actorKind,
        action: pxAuditLog.action,
        targetKind: pxAuditLog.targetKind,
        targetId: pxAuditLog.targetId,
        payload: pxAuditLog.payload,
        // pull the email via a side query later — for now show user id
      })
      .from(pxAuditLog)
      .orderBy(desc(pxAuditLog.createdAt))
      .limit(MAX_EVENTS)
      .catch(() => [] as Array<Record<string, unknown>>),
  ]);

  const iox: AuditEvent[] = ioxRows.map((r) => ({
    id: r.id,
    module: "IOX",
    ts: r.createdAt.toISOString(),
    actor: r.user?.name ?? r.user?.email ?? r.userId ?? "—",
    action: r.action,
    target: r.entityType,
    targetId: r.entityId ?? undefined,
    payloadSummary: summarisePayload({ old: r.oldValue, new: r.newValue }),
    ip: r.ipAddress ?? undefined,
  }));

  // Resolve px actor IDs to emails in one batch
  const pxActorIds = new Set<string>();
  for (const r of pxRows) {
    if (r.actorUserId) pxActorIds.add(r.actorUserId as string);
  }
  let pxActorMap = new Map<string, string>();
  if (pxActorIds.size > 0) {
    try {
      const found = await db.execute(sql`
        SELECT id, email FROM px_user WHERE id = ANY(${Array.from(pxActorIds)})
      `);
      for (const row of found.rows as { id: string; email: string }[]) {
        pxActorMap.set(row.id, row.email);
      }
    } catch {
      pxActorMap = new Map();
    }
  }

  const procurex: AuditEvent[] = pxRows.map((r) => {
    const ts = r.ts instanceof Date ? r.ts : new Date(r.ts as string);
    return {
      id: String(r.id),
      module: "ProcureX",
      ts: ts.toISOString(),
      actor:
        r.actorUserId && pxActorMap.get(r.actorUserId as string)
          ? (pxActorMap.get(r.actorUserId as string) as string)
          : ((r.actorUserId as string) ?? r.actorKind ?? "system"),
      actorKind: (r.actorKind as string) ?? undefined,
      action: r.action as string,
      target: r.targetKind as string,
      targetId: (r.targetId as string) ?? undefined,
      payloadSummary: summarisePayload(r.payload),
    };
  });

  return [...iox, ...procurex]
    .sort((a, b) => b.ts.localeCompare(a.ts))
    .slice(0, MAX_EVENTS);
}

export async function getAuditStats(events: AuditEvent[]): Promise<AuditStats> {
  const stats: AuditStats = {
    total: events.length,
    iox: 0,
    procurex: 0,
    topActions: [],
    topActors: [],
  };
  const actionCount = new Map<string, number>();
  const actorCount = new Map<string, number>();
  for (const e of events) {
    if (e.module === "IOX") stats.iox++;
    else stats.procurex++;
    actionCount.set(e.action, (actionCount.get(e.action) ?? 0) + 1);
    actorCount.set(e.actor, (actorCount.get(e.actor) ?? 0) + 1);
  }
  stats.topActions = [...actionCount.entries()]
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  stats.topActors = [...actorCount.entries()]
    .map(([actor, count]) => ({ actor, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  return stats;
}

function summarisePayload(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  try {
    const json = JSON.stringify(payload);
    if (json.length <= 120) return json;
    return json.slice(0, 117) + "…";
  } catch {
    return undefined;
  }
}
