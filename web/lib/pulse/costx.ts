import "server-only";

import { getMasterplans } from "@/lib/queries/masterplans";
import { getModuleActivity } from "./activity";
import { formatMoney, pad2 } from "./formatters";
import type { ProjectPulseData } from "./types";

function mostCommon(values: (string | null | undefined)[]): string | undefined {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: string | undefined;
  let bestN = 0;
  for (const [v, n] of counts) {
    if (n > bestN) {
      best = v;
      bestN = n;
    }
  }
  return best;
}

/**
 * CostX Project Pulse — a portfolio rollup across the user's masterplans.
 *
 * - Hero: "{N} Masterplans" + most common country (or status breakdown).
 * - Budget block reframed as **Plan Maturity** (approved ÷ total) — cost plans
 *   have no "spent vs budget", so we surface planning maturity instead.
 * - Metrics: count, total plan value, avg cost/GFA, approved.
 * - Activity: IOX audit events for the `masterplan` entity type.
 */
export async function getCostxPulse(userId?: string): Promise<ProjectPulseData> {
  const activity = await getModuleActivity({
    modules: ["IOX"],
    entityTypes: ["masterplan"],
  });

  try {
    const masterplans = await getMasterplans(userId);
    const total = masterplans.length;

    if (total === 0) {
      return {
        hero: {
          title: "No masterplans yet",
          subtitle: "Create your first cost plan to see it here",
        },
        metrics: [
          { iconKey: "masterplan", label: "Masterplans", value: "00", href: "/costx" },
          { iconKey: "cost", label: "Plan Value", value: "—" },
          { iconKey: "rate", label: "Avg Cost/GFA", value: "—" },
          { iconKey: "project", label: "Approved", value: "00" },
        ],
        activity,
        state: "empty",
      };
    }

    const approved = masterplans.filter((m) => m.status === "APPROVED").length;
    const active = masterplans.filter((m) => m.status === "ACTIVE").length;
    const draft = masterplans.filter((m) => m.status === "DRAFT").length;

    const totalCost = masterplans.reduce((s, m) => s + (Number(m.totalCost) || 0), 0);
    const perGfaValues = masterplans
      .map((m) => Number(m.costPerGfa) || 0)
      .filter((v) => v > 0);
    const avgCostPerGfa =
      perGfaValues.length > 0
        ? perGfaValues.reduce((s, v) => s + v, 0) / perGfaValues.length
        : 0;

    const maturity = Math.round((approved / total) * 100);
    const topCountry = mostCommon(masterplans.map((m) => m.country));

    return {
      hero: {
        title: `${total} Masterplan${total === 1 ? "" : "s"}`,
        subtitle: topCountry ?? `${active} active · ${draft} draft`,
        verified: true,
      },
      budget: {
        label: "Plan Maturity",
        statusLabel: maturity >= 70 ? "On Track" : maturity > 0 ? "In Progress" : "Early",
        statusTone: maturity >= 70 ? "good" : "neutral",
        percent: maturity,
        caption: `${approved} of ${total} approved`,
      },
      metrics: [
        {
          iconKey: "masterplan",
          label: "Masterplans",
          value: pad2(total),
          sub: `${active} active`,
          href: "/costx",
        },
        { iconKey: "cost", label: "Plan Value", value: formatMoney(totalCost), sub: "total" },
        {
          iconKey: "rate",
          label: "Avg Cost/GFA",
          value: formatMoney(avgCostPerGfa),
          sub: "per m²",
        },
        {
          iconKey: "project",
          label: "Approved",
          value: pad2(approved),
          sub: `${draft} draft`,
        },
      ],
      activity,
      state: "ok",
    };
  } catch {
    return {
      hero: { title: "CostX Portfolio", subtitle: "Metrics unavailable right now" },
      metrics: [],
      activity,
      state: "error",
    };
  }
}
