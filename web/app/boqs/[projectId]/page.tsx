import { Header } from "@/components/Header";
import { BoqWorkspace, type WorkspaceData } from "@/components/BoqWorkspace";
import { demoProjects } from "@/lib/demoProjects";
import { notFound } from "next/navigation";
import { loadProjectData } from "@/lib/projectData";
import { demoItems, demoSections, demoTotals } from "@/lib/demoBoq";
import { getProject } from "@/lib/projectStore";
import type { BoqDetailItem } from "@/components/BoqItemDetails";

function buildFromDemo(): WorkspaceData {
  // Demo workspace: 9 sections, all items belong to section 01
  const itemsBySection: Record<string, BoqDetailItem[]> = {};
  for (const sec of demoSections) {
    itemsBySection[sec.code] = sec.code === "01" ? demoItems.map((it) => ({
      ...it,
      pomiSection: undefined,
      pomiSubSection: undefined,
      stage: undefined,
      confidence: undefined,
      flag: undefined,
    })) : [];
  }
  return {
    sections: demoSections.map((s) => ({
      code: s.code,
      name: s.name,
      itemCount: s.itemCount,
    })),
    itemsBySection,
    totals: {
      amount: demoTotals.amount,
      items: demoTotals.items,
      sections: demoTotals.sections,
      trades: demoTotals.trades,
      currentVersion: demoTotals.currentVersion,
    },
  };
}

async function buildFromSource(sourceFile: string, projectVersion: string): Promise<WorkspaceData> {
  const pd = await loadProjectData(sourceFile);
  const itemsBySection: Record<string, BoqDetailItem[]> = {};
  for (const [key, list] of Object.entries(pd.itemsBySection)) {
    itemsBySection[key] = list.map((it) => ({
      code: it.code,
      description: it.description,
      unit: it.unit,
      quantity: it.quantity,
      rate: it.rate,
      amount: it.amount,
      version: projectVersion,
      pomiSection: it.pomiSection,
      pomiSubSection: it.pomiSubSection,
      nrm: it.nrm,
      nrmDescription: it.nrmDescription,
      stage: it.stage,
      confidence: it.confidence,
      flag: it.flag,
    }));
  }
  return {
    sections: pd.sections.map((s) => ({
      code: s.code,
      name: s.name,
      itemCount: s.itemCount,
      totalAmount: s.totalAmount,
    })),
    itemsBySection,
    totals: {
      amount: pd.totalAmount,
      items: pd.items.length,
      sections: pd.sections.length,
      trades: pd.sections.length,
      currentVersion: projectVersion,
    },
  };
}

export default async function ProjectDashboard({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  // 1. Try the imported-projects store (real uploads)
  const stored = await getProject(projectId);
  if (stored) {
    let data: WorkspaceData;
    if (stored.sourceFile) {
      try {
        data = await buildFromSource(stored.sourceFile, "v1.0");
      } catch (e) {
        console.error("[projectData] failed to load", stored.sourceFile, e);
        data = buildFromDemo();
      }
    } else {
      // Still processing — show empty state via demo fallback
      data = buildFromDemo();
    }
    return (
      <>
        <Header />
        <main className="flex-1 min-h-0 overflow-hidden">
          <BoqWorkspace projectName={stored.name} data={data} />
        </main>
      </>
    );
  }

  // 2. Fall back to seeded demo projects (Skyline, Pearl Bay, Citywalk)
  const project = demoProjects.find((p) => p.id === projectId);
  if (!project) notFound();

  let data: WorkspaceData;
  if (project.sourceFile) {
    try {
      data = await buildFromSource(project.sourceFile, project.version);
    } catch (e) {
      console.error("[projectData] failed to load", project.sourceFile, e);
      data = buildFromDemo();
    }
  } else {
    data = buildFromDemo();
  }

  return (
    <>
      <Header />
      <main className="flex-1 min-h-0 overflow-hidden">
        <BoqWorkspace projectName={project.name} data={data} />
      </main>
    </>
  );
}
