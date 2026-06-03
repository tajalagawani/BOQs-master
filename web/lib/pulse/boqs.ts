import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/modules/core/db";
import { boqTemplates, boqItems, boqItemRates } from "@/modules/boq/schema";
import { getModuleActivity } from "./activity";
import { formatPercent, pad2 } from "./formatters";
import { getUserWorkspaceIds } from "./workspace";
import type { ProjectPulseData } from "./types";

const formatCount = (n: number) => Math.max(0, Math.trunc(n)).toLocaleString("en-US");

/** BOQ template count across the user's workspaces (used by the Home rollup). */
export async function countBoqTemplatesForUser(userId: string): Promise<number> {
  const workspaceIds = await getUserWorkspaceIds(userId);
  if (workspaceIds.length === 0) return 0;
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(boqTemplates)
    .where(inArray(boqTemplates.workspaceId, workspaceIds));
  return Number(row?.n ?? 0);
}

function emptyBoqsPulse(activity: ProjectPulseData["activity"]): ProjectPulseData {
  return {
    hero: {
      title: "No BOQs yet",
      subtitle: "Create or import a Bill of Quantities to see it here",
    },
    metrics: [
      { iconKey: "boq", label: "BOQs", value: "00", href: "/boqs" },
      { iconKey: "file", label: "Items", value: "—" },
      { iconKey: "cost", label: "Priced", value: "—" },
      { iconKey: "rate", label: "Unpriced", value: "—" },
    ],
    activity,
    state: "empty",
  };
}

/**
 * BOQs Project Pulse — a portfolio rollup over the structured BOQ tables
 * (`px_boq_template` / `px_boq_item` / `px_boq_item_rate`) for the user's
 * workspaces.
 *
 * Pricing is defined at the item level: an item is "priced" if it has at least
 * one rate row with `isUnpriced = false`. This avoids double-counting rates
 * that exist across multiple pricesets.
 */
export async function getBoqsPulse(userId?: string): Promise<ProjectPulseData> {
  const activity = await getModuleActivity({ entityTypes: ["boq"] });

  try {
    if (!userId) return emptyBoqsPulse(activity);
    const workspaceIds = await getUserWorkspaceIds(userId);
    if (workspaceIds.length === 0) return emptyBoqsPulse(activity);

    const templateRows = await db
      .select({ id: boqTemplates.id })
      .from(boqTemplates)
      .where(inArray(boqTemplates.workspaceId, workspaceIds));
    const templateIds = templateRows.map((r) => r.id);
    if (templateIds.length === 0) return emptyBoqsPulse(activity);

    const [[totals], [priced]] = await Promise.all([
      db
        .select({ items: sql<number>`count(*)::int` })
        .from(boqItems)
        .where(inArray(boqItems.templateId, templateIds)),
      db
        .select({ items: sql<number>`count(distinct ${boqItems.id})::int` })
        .from(boqItems)
        .innerJoin(
          boqItemRates,
          and(
            eq(boqItemRates.itemId, boqItems.id),
            eq(boqItemRates.isUnpriced, false),
          ),
        )
        .where(inArray(boqItems.templateId, templateIds)),
    ]);

    const templates = templateIds.length;
    const totalItems = Number(totals?.items ?? 0);
    const pricedItems = Number(priced?.items ?? 0);
    const unpriced = Math.max(0, totalItems - pricedItems);
    const pct = totalItems > 0 ? Math.round((pricedItems / totalItems) * 100) : 0;

    return {
      hero: {
        title: `${templates} BOQ${templates === 1 ? "" : "s"}`,
        subtitle: `${formatCount(totalItems)} line item${totalItems === 1 ? "" : "s"}`,
        verified: true,
      },
      budget:
        totalItems > 0
          ? {
              label: "Pricing Progress",
              statusLabel: pct >= 90 ? "Near Complete" : pct > 0 ? "In Progress" : "Unpriced",
              statusTone: pct >= 90 ? "good" : pct > 0 ? "neutral" : "warn",
              percent: pct,
              caption: `${formatCount(pricedItems)} of ${formatCount(totalItems)} items priced`,
            }
          : undefined,
      metrics: [
        { iconKey: "boq", label: "BOQs", value: pad2(templates), sub: "templates", href: "/boqs" },
        { iconKey: "file", label: "Items", value: formatCount(totalItems), sub: "line items" },
        { iconKey: "cost", label: "Priced", value: formatPercent(pct), sub: `${formatCount(pricedItems)} done` },
        { iconKey: "rate", label: "Unpriced", value: formatCount(unpriced), sub: "to price" },
      ],
      activity,
      state: "ok",
    };
  } catch {
    return {
      hero: { title: "BOQ Portfolio", subtitle: "Metrics unavailable right now" },
      metrics: [],
      activity,
      state: "error",
    };
  }
}
