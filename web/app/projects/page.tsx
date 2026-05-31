export const dynamic = "force-dynamic";

import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { ProjectPulse } from "@/components/ProjectPulse";
import { getSession } from "@/lib/session";
import { getMasterplans } from "@/lib/queries/masterplans";
import { getBenchmarkProjects } from "@/lib/queries/benchmarking";
import ProjectsClient, {
  type ProjectListEntry,
} from "@/components/projects/ProjectsClient";

export default async function ProjectsPage() {
  const { user } = await getSession();
  const [masterplans, benchmarks] = await Promise.all([
    getMasterplans(user.id),
    getBenchmarkProjects(user.id),
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
    <>
      {/* Same fixed bg as the home page, so the two screens read as a set. */}
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 bg-no-repeat pointer-events-none"
        style={{
          backgroundImage: "url(/iox-bg.png)",
          backgroundSize: "cover",
          backgroundPosition: "center center",
        }}
      />

      <Header />

      <main className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full w-full px-6 lg:px-8 py-3 lg:py-4 grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4 lg:gap-6">
          {/* Left column — hero + grid in a centered block, footer pinned to
              the bottom of the column. Same shape as app/page.tsx. */}
          <div className="min-w-0 min-h-0 flex flex-col items-center">
            <ProjectsClient projects={projects} />

            <div className="flex-1 min-h-0" />

            <div className="shrink-0 self-stretch flex items-center justify-between text-[10.5px] text-zinc-500 px-1 pt-2">
              <div className="flex items-center gap-2.5">
                <Image
                  src="/iox-logo.svg"
                  alt="IOX"
                  width={1338}
                  height={461}
                  className="h-4 w-auto"
                />
                <span className="text-zinc-300">|</span>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck
                    className="size-3 text-zinc-500"
                    strokeWidth={1.75}
                  />
                  <span>Project data secured and synced in real time</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span>All systems normal</span>
              </div>
            </div>
          </div>

          {/* Right column — ProjectPulse, same 400px slot as the home page. */}
          <div className="hidden xl:flex min-h-0">
            <ProjectPulse />
          </div>
        </div>
      </main>
    </>
  );
}
