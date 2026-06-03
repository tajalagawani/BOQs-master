import "server-only";

import { getProjectsForUser } from "@/modules/procurex/projects";
import { getModuleActivity } from "./activity";
import { formatMoney, pad2 } from "./formatters";
import { mostCommon } from "./workspace";
import type { ProjectPulseData } from "./types";

/** Statuses considered "in progress" (a tender that still needs work). */
const PENDING_STATUSES = new Set(["draft", "configured", "analysing", "review"]);

const toMajorUnits = (cents: bigint | number | null | undefined): number =>
  Number(cents ?? 0) / 100;

/**
 * ProcureX Project Pulse — a portfolio rollup across the user's tenders.
 *
 * NOTE: there is no separate tenders/instructions/PO table — `px_project` *is*
 * the tender. Metrics are derived only from confirmed columns (status,
 * budgetCents, contractSumCents, return dates) — nothing fabricated.
 */
export async function getProcurexPulse(userId: string): Promise<ProjectPulseData> {
  const activity = await getModuleActivity({ modules: ["ProcureX"] });

  try {
    const projects = await getProjectsForUser(userId);
    const total = projects.length;

    if (total === 0) {
      return {
        hero: {
          title: "No tenders yet",
          subtitle: "Create your first ProcureX project to see it here",
        },
        metrics: [
          { iconKey: "tender", label: "Pending Tenders", value: "00", href: "/procurex" },
          { iconKey: "cost", label: "Total Budget", value: "—" },
          { iconKey: "project", label: "Active", value: "00" },
          { iconKey: "calendar", label: "Returns Due", value: "00" },
        ],
        activity,
        state: "empty",
      };
    }

    const pending = projects.filter((p) => PENDING_STATUSES.has(p.status)).length;
    const reported = projects.filter((p) => p.status === "reported").length;
    const active = projects.filter(
      (p) => p.status !== "archived" && p.status !== "reported",
    ).length;

    const totalBudget = projects.reduce((s, p) => s + toMajorUnits(p.budgetCents), 0);
    const totalContract = projects.reduce(
      (s, p) => s + toMajorUnits(p.contractSumCents),
      0,
    );
    const currency = mostCommon(projects.map((p) => p.currency)) ?? "SAR";

    // Returns due within the next 7 days.
    const now = new Date();
    const horizon = new Date(now.getTime() + 7 * 86_400_000);
    const dueSoon = projects.filter((p) => {
      const raw = p.adjustedReturnAt ?? p.originalReturnAt;
      if (!raw) return false;
      const d = new Date(raw as unknown as string);
      return !Number.isNaN(d.getTime()) && d >= now && d <= horizon;
    }).length;

    const topLocation = mostCommon(
      projects.map((p) => [p.city, p.country].filter(Boolean).join(", ") || null),
    );

    const committedPct =
      totalBudget > 0 ? Math.round((totalContract / totalBudget) * 100) : 0;

    const budget =
      totalBudget > 0
        ? {
            label: "Committed vs Budget",
            statusLabel:
              committedPct === 0
                ? "Open"
                : committedPct <= 100
                  ? "On Track"
                  : "Over Budget",
            statusTone:
              committedPct === 0
                ? ("neutral" as const)
                : committedPct <= 100
                  ? ("good" as const)
                  : ("bad" as const),
            percent: committedPct,
            caption: `${formatMoney(totalContract, currency)} / ${formatMoney(
              totalBudget,
              currency,
            )}`,
          }
        : undefined;

    return {
      hero: {
        title: `${total} Tender${total === 1 ? "" : "s"}`,
        subtitle: topLocation ?? `${pending} in progress · ${reported} reported`,
        verified: true,
      },
      budget,
      metrics: [
        {
          iconKey: "tender",
          label: "Pending Tenders",
          value: pad2(pending),
          sub: "in progress",
          href: "/procurex",
        },
        {
          iconKey: "cost",
          label: "Total Budget",
          value: formatMoney(totalBudget, currency),
          sub: "portfolio",
        },
        { iconKey: "project", label: "Active", value: pad2(active), sub: `of ${total}` },
        {
          iconKey: "calendar",
          label: "Returns Due",
          value: pad2(dueSoon),
          sub: "next 7 days",
        },
      ],
      activity,
      state: "ok",
    };
  } catch {
    return {
      hero: { title: "ProcureX Portfolio", subtitle: "Metrics unavailable right now" },
      metrics: [],
      activity,
      state: "error",
    };
  }
}
