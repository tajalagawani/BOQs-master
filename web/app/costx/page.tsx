// CostX masterplan-estimates list page — faithful port of
// roshn/src/app/masterplan-estimates/page.tsx, rendered inside the
// IOX shell.

export const dynamic = "force-dynamic";

import { Header } from "@/components/Header";
import { getSession } from "@/lib/session";
import { getUserPermissions } from "@/lib/permissions";
import { getMasterplans } from "@/lib/queries/masterplans";
import { getBenchmarkProjects } from "@/lib/queries/benchmarking";
import { getUsers } from "@/lib/queries/users";
import MasterplanListClient, {
  type MasterplanListEntry,
} from "@/components/costx/MasterplanListClient";

export default async function CostxListPage() {
  const { user: currentUser } = await getSession();

  const [masterplans, users, projectsRaw, permissions] = await Promise.all([
    getMasterplans(currentUser.id),
    getUsers(),
    getBenchmarkProjects(currentUser.id),
    getUserPermissions(currentUser.id),
  ]);

  // Map benchmark projects with team members + polygon + coordinates
  const projects = projectsRaw.map((p) => ({
    id: p.id,
    name: p.name,
    currency: p.currency || "SAR",
    polygon: (p.polygon as number[][] | null) ?? null,
    latitude: p.latitude ? Number(p.latitude) : null,
    longitude: p.longitude ? Number(p.longitude) : null,
    teamMembers:
      p.teamMembers?.map((tm) => ({
        userId: tm.user.id,
        name: tm.user.name,
        email: tm.user.email,
        role: tm.role,
        userRole: tm.user.role,
      })) ?? [],
  }));

  // Shape masterplans into the list entry the client expects.
  // The query returns Prisma Decimal — convert to numbers here so the
  // client can render and arithmetic-compare cleanly.
  const initial: MasterplanListEntry[] = masterplans.map((mp) => ({
    id: mp.id,
    name: mp.name,
    description: mp.description,
    grossLandArea: Number(mp.grossLandArea),
    calculatedPlotArea: Number(mp.calculatedPlotArea),
    balanceExternalArea: Number(mp.balanceExternalArea),
    totalUnits: mp.totalUnits,
    parkingSpaces: mp.parkingSpaces,
    contingency: Number(mp.contingency),
    totalCost: Number(mp.totalCost),
    costPerGfa: Number(mp.costPerGfa),
    assetClass: mp.assetClass,
    assetTypeL1: mp.assetTypeL1,
    assetFormL2: mp.assetFormL2,
    status: mp.status,
    version: mp.version,
    benchmarkProjectId: mp.benchmarkProjectId,
    numberOfPhases: mp.numberOfPhases,
    phases: mp.phases?.map((p) => ({
      phaseNumber: p.phaseNumber,
      phaseName: p.phaseName,
      startDate: p.startDate,
      totalMonths: p.totalMonths,
    })),
    createdAt: mp.createdAt,
    updatedAt: mp.updatedAt,
    createdBy: mp.createdBy,
    teamMembers: mp.teamMembers,
  }));

  return (
    <>
      {/* Same fixed bg as the home page. */}
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
        <MasterplanListClient
          initialMasterplans={initial}
          users={users}
          projects={projects}
          permissions={permissions}
          currentUserEmail={currentUser.email}
        />
      </main>
    </>
  );
}
