import "server-only";

import { getMasterplanStats } from "@/lib/queries/masterplans";
import { getProjectsForUser } from "@/modules/procurex/projects";
import { getModuleActivity } from "./activity";
import { countBoqTemplatesForUser } from "./boqs";
import { formatMoney, pad2 } from "./formatters";
import type { ProjectPulseData } from "./types";

const PENDING_STATUSES = new Set(["draft", "configured", "analysing", "review"]);

/**
 * Home Project Pulse — a cross-module portfolio rollup. One headline tile per
 * active module (CostX masterplans, ProcureX tenders, BOQs) plus a portfolio
 * cost-plan value. Activity is unfiltered (all modules) since Home has no
 * single module context.
 *
 * Each sub-fetch is independently guarded so one module's failure never blanks
 * the whole widget.
 */
export async function getHomePulse(userId: string): Promise<ProjectPulseData> {
  const activity = await getModuleActivity({ limit: 4 });

  try {
    const [stats, projects, boqCount] = await Promise.all([
      getMasterplanStats(userId).catch(() => null),
      getProjectsForUser(userId).catch(() => []),
      countBoqTemplatesForUser(userId).catch(() => 0),
    ]);

    const mpTotal = stats?.totalProjects ?? 0;
    const mpActive = stats?.activeProjects ?? 0;
    const mpCost = stats?.totalCost ?? 0;
    const txTotal = projects.length;
    const txPending = projects.filter((p) => PENDING_STATUSES.has(p.status)).length;

    const hasAny = mpTotal + txTotal + boqCount > 0;

    return {
      hero: {
        title: "IOX Portfolio",
        subtitle: `${mpTotal} plan${mpTotal === 1 ? "" : "s"} · ${txTotal} tender${
          txTotal === 1 ? "" : "s"
        } · ${boqCount} BOQ${boqCount === 1 ? "" : "s"}`,
        verified: true,
      },
      metrics: [
        {
          iconKey: "masterplan",
          label: "Masterplans",
          value: pad2(mpTotal),
          sub: `${mpActive} active`,
          href: "/costx",
        },
        {
          iconKey: "tender",
          label: "Tenders",
          value: pad2(txTotal),
          sub: `${txPending} pending`,
          href: "/procurex",
        },
        { iconKey: "boq", label: "BOQs", value: pad2(boqCount), sub: "templates", href: "/boqs" },
        { iconKey: "cost", label: "Plan Value", value: formatMoney(mpCost), sub: "cost plans" },
      ],
      activity,
      state: hasAny ? "ok" : "empty",
    };
  } catch {
    return {
      hero: { title: "IOX Portfolio", subtitle: "Metrics unavailable right now" },
      metrics: [],
      activity,
      state: "error",
    };
  }
}
