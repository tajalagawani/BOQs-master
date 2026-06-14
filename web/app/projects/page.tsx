export const dynamic = "force-dynamic";

import { getSession } from "@/lib/session";
import { getMasterplans } from "@/lib/queries/masterplans";
import { getBenchmarkProjects } from "@/lib/queries/benchmarking";
import { getProjectsPulse } from "@/lib/pulse/projects";
import {
  ProjectsSuiteWorkspace,
  type ProjectListEntry,
} from "@/components/projects/ProjectsSuiteWorkspace";

export default async function ProjectsPage() {
  const { user } = await getSession();
  const [masterplans, benchmarks, pulse] = await Promise.all([
    getMasterplans(user.id),
    getBenchmarkProjects(user.id),
    getProjectsPulse(user.id),
  ]);

  const projects: ProjectListEntry[] = [
    ...masterplans.map((mp) => ({
      id: mp.id,
      kind: "Masterplan" as const,
      name: mp.name,
      assetClass: mp.assetClass,
      developer: mp.developer ?? null,
      country: mp.country ?? null,
      city: null as string | null,
      totalCost: Number(mp.totalCost),
      gla: Number(mp.grossLandArea),
      status: mp.status,
      updatedAt: mp.updatedAt,
      href: `/costx/${mp.id}`,
    })),
    ...benchmarks.map((b) => ({
      id: b.id,
      kind: "Benchmark" as const,
      name: b.name,
      assetClass: b.assetClass ?? null,
      developer: b.developer ?? null,
      country: b.country ?? null,
      city: b.city ?? null,
      totalCost: b.totalCost ? Number(b.totalCost) : null,
      gla: b.grossLandArea ? Number(b.grossLandArea) : null,
      status: null as string | null,
      updatedAt: b.updatedAt,
      href: `/benchmarking?focus=${b.id}`,
    })),
  ];

  return (
    <main className="flex-1 min-h-0 overflow-y-auto">
      <ProjectsSuiteWorkspace projects={projects} pulse={pulse} />
    </main>
  );
}
