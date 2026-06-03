import "server-only";

import { listAuditEvents, type AuditModule } from "@/lib/platform/audit";
import { relativeTime } from "./formatters";
import type { PulseActivityItem, PulseIconKey } from "./types";

/** Derive a Pulse icon key from an audit event's target/entity type. */
export function iconForTarget(target: string): PulseIconKey {
  const t = (target || "").toLowerCase();
  if (t.includes("tender") || t.includes("rfq") || t.includes("itt")) return "tender";
  if (t.includes("boq")) return "boq";
  if (t.includes("masterplan")) return "masterplan";
  if (t.includes("change")) return "change-order";
  if (t.includes("instruction")) return "instruction";
  if (t.includes("po") || t.includes("purchase") || t.includes("order")) return "po";
  if (t.includes("rate")) return "rate";
  if (t.includes("project")) return "project";
  return "file";
}

function humanize(s: string): string {
  if (!s) return "";
  return s
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

/** "create" → "created", "update" → "updated", others passed through. */
function pastTense(action: string): string {
  const a = (action || "").toLowerCase();
  if (a === "create") return "created";
  if (a === "update") return "updated";
  if (a === "delete") return "deleted";
  if (a.endsWith("e")) return `${a}d`;
  return a;
}

export interface ModuleActivityOptions {
  /** Restrict to one or both audit sources. */
  modules?: AuditModule[];
  /**
   * Keep only events whose target/entity type contains one of these tokens
   * (case-insensitive substring match, so "boq" matches "boq_template").
   * Omit to keep all targets.
   */
  entityTypes?: string[];
  limit?: number;
}

/**
 * Module-scoped Recent Activity for the Pulse widget. Wraps the shared
 * `listAuditEvents()` (which already unions Prisma + Drizzle audit tables and
 * swallows DB errors), then filters, maps, and slices.
 *
 * Returns `[]` rather than throwing if anything goes wrong, so the widget can
 * degrade to its empty state instead of crashing the host page.
 */
export async function getModuleActivity(
  opts: ModuleActivityOptions = {},
): Promise<PulseActivityItem[]> {
  const { modules, entityTypes, limit = 4 } = opts;
  try {
    const events = await listAuditEvents();
    const tokens = entityTypes?.map((t) => t.toLowerCase());

    return events
      .filter((e) => (modules ? modules.includes(e.module) : true))
      .filter((e) =>
        tokens
          ? tokens.some((tok) => (e.target || "").toLowerCase().includes(tok))
          : true,
      )
      .slice(0, limit)
      .map((e) => {
        const target = humanize(e.target) || "Item";
        return {
          iconKey: iconForTarget(e.target),
          title: `${target} ${pastTense(e.action)}`,
          by: e.actor ? `by ${e.actor}` : undefined,
          time: relativeTime(e.ts),
        } satisfies PulseActivityItem;
      });
  } catch {
    return [];
  }
}
