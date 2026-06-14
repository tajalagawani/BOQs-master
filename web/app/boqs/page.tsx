// Always read live project store — no static caching
export const dynamic = "force-dynamic";

import {
  BoqsSuiteWorkspace,
  type BoqsGridEntry,
} from "@/components/boqs/BoqsSuiteWorkspace";
import type { BoqCardStatus } from "@/components/boqs/BoqCard";
import { demoProjects } from "@/lib/demoProjects";
import { fmtINR } from "@/lib/demoBoq";
import { listProjects } from "@/lib/projectStore";
import { requireUserId } from "@/modules/core/auth";
import { getBoqsPulse } from "@/lib/pulse/boqs";

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!t) return "";
  const sec = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} h ago`;
  return `${Math.floor(sec / 86400)} d ago`;
}

export default async function BoqsHome() {
  // BOQ data is scoped by ProcureX workspace membership. Resolve the user id
  // when authenticated; fall back to the empty-state pulse otherwise so the
  // page still renders for anonymous/demo viewing.
  let userId: string | undefined;
  try {
    userId = await requireUserId();
  } catch {
    userId = undefined;
  }

  const [imported, pulse] = await Promise.all([
    listProjects(),
    getBoqsPulse(userId),
  ]);

  const importedCards: BoqsGridEntry[] = imported.map((p) => ({
    id: p.id,
    name: p.name,
    status: (p.status === "complete"
      ? "Imported"
      : p.status === "processing"
        ? "Processing"
        : "Failed") satisfies BoqCardStatus,
    location: p.fileName,
    items: null,
    total: null,
    updatedRelative: timeAgo(p.completedAt ?? p.createdAt),
    href: `/boqs/${p.id}`,
  }));

  const demoCards: BoqsGridEntry[] = demoProjects.map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status as BoqCardStatus,
    location: p.location,
    items: p.items,
    total: fmtINR(p.totalAmount),
    updatedRelative: p.updatedRelative,
    href: `/boqs/${p.id}`,
  }));

  const projects: BoqsGridEntry[] = [...importedCards, ...demoCards];

  return (
    <main className="flex-1 min-h-0 overflow-y-auto">
      <BoqsSuiteWorkspace projects={projects} pulse={pulse} />
    </main>
  );
}
