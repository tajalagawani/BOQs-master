import {
  ProcurexWorkspace,
  type ProcurexGridEntry,
} from "@/components/procurex/ProcurexWorkspace";
import { requireUserId } from "@/modules/core/auth";
import {
  getBidderCountsByProjectId,
  getProjectsForUser,
} from "@/modules/procurex/projects";
import { getProcurexPulse } from "@/lib/pulse/procurex";

function formatDate(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const date = new Date(d);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function ProcurexHome() {
  const userId = await requireUserId();
  const projects = await getProjectsForUser(userId);
  const [bidderCounts, pulse] = await Promise.all([
    getBidderCountsByProjectId(projects.map((p) => p.id)),
    getProcurexPulse(userId),
  ]);

  const entries: ProcurexGridEntry[] = projects.map((p) => {
    const location = [p.city, p.country].filter(Boolean).join(", ") || null;
    const name =
      p.name && p.name !== "Untitled tender" ? p.name : "Untitled tender";
    const href =
      p.status === "draft"
        ? `/procurex/projects/${p.id}/setup?step=1`
        : `/procurex/projects/${p.id}`;
    return {
      id: p.id,
      name,
      status: p.status,
      location,
      bidderCount: bidderCounts[p.id] ?? 0,
      deadline: formatDate(p.adjustedReturnAt ?? p.originalReturnAt),
      href,
    };
  });

  return (
    <main className="flex-1 min-h-0 overflow-y-auto">
      <ProcurexWorkspace projects={entries} pulse={pulse} />
    </main>
  );
}
