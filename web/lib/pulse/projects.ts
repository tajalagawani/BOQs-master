import "server-only";

import { getMasterplans } from "@/lib/queries/masterplans";
import { getBenchmarkProjects } from "@/lib/queries/benchmarking";
import { getModuleActivity } from "./activity";
import { formatMoney, pad2 } from "./formatters";
import type { ProjectPulseData } from "./types";

/**
 * Projects Project Pulse — the portfolio view spanning CostX masterplans and
 * benchmark reference projects (the same two sources the /projects grid lists).
 */
export async function getProjectsPulse(userId: string): Promise<ProjectPulseData> {
  const activity = await getModuleActivity({ limit: 4 });

  try {
    const [masterplans, benchmarks] = await Promise.all([
      getMasterplans(userId).catch(() => [] as Awaited<ReturnType<typeof getMasterplans>>),
      getBenchmarkProjects(userId).catch(
        () => [] as Awaited<ReturnType<typeof getBenchmarkProjects>>,
      ),
    ]);

    const mpCount = masterplans.length;
    const bmCount = benchmarks.length;
    const total = mpCount + bmCount;

    if (total === 0) {
      return {
        hero: {
          title: "No projects yet",
          subtitle: "Create a masterplan or add a benchmark to see it here",
        },
        metrics: [
          { iconKey: "masterplan", label: "Masterplans", value: "00", href: "/costx" },
          { iconKey: "project", label: "Benchmarks", value: "00" },
          { iconKey: "cost", label: "Total Value", value: "—" },
          { iconKey: "rate", label: "Asset Classes", value: "00" },
        ],
        activity,
        state: "empty",
      };
    }

    const activeMp = masterplans.filter((m) => m.status === "ACTIVE").length;
    const mpCost = masterplans.reduce((s, m) => s + (Number(m.totalCost) || 0), 0);
    const bmCost = benchmarks.reduce((s, b) => s + (Number(b.totalCost) || 0), 0);
    const totalCost = mpCost + bmCost;

    const assetClasses = new Set(
      [
        ...masterplans.map((m) => m.assetClass),
        ...benchmarks.map((b) => b.assetClass),
      ].filter(Boolean) as string[],
    ).size;

    return {
      hero: {
        title: `${total} Project${total === 1 ? "" : "s"}`,
        subtitle: `${mpCount} masterplan${mpCount === 1 ? "" : "s"} · ${bmCount} benchmark${
          bmCount === 1 ? "" : "s"
        }`,
        verified: true,
      },
      metrics: [
        {
          iconKey: "masterplan",
          label: "Masterplans",
          value: pad2(mpCount),
          sub: `${activeMp} active`,
          href: "/costx",
        },
        {
          iconKey: "project",
          label: "Benchmarks",
          value: pad2(bmCount),
          sub: "reference",
          href: "/benchmarking",
        },
        {
          iconKey: "cost",
          label: "Total Value",
          value: formatMoney(totalCost),
          sub: "portfolio",
        },
        {
          iconKey: "rate",
          label: "Asset Classes",
          value: pad2(assetClasses),
          sub: "typologies",
        },
      ],
      activity,
      state: "ok",
    };
  } catch {
    return {
      hero: { title: "Project Portfolio", subtitle: "Metrics unavailable right now" },
      metrics: [],
      activity,
      state: "error",
    };
  }
}
