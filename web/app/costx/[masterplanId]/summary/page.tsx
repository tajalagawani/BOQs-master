// /costx/[id]/summary — read-only summary dashboard.
// Mirrors the source app: masterplan-estimates/[id]/summary page.

export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import {
  getMasterplanWithCosts,
  getExecutiveSummary,
} from "@/lib/queries/masterplans";
import {
  getCostModelEntries,
  getConfiguration,
} from "@/lib/queries/configuration";
import { loadMasterplanVersion } from "@/actions/masterplan";
import { convertDecimalToNumber } from "@/utils/decimal";
import MasterplanSummaryClient from "@/components/masterplan/MasterplanSummaryClient";

export default async function MasterplanSummaryPage({
  params,
}: {
  params: Promise<{ masterplanId: string }>;
}) {
  const { masterplanId } = await params;

  const [
    masterplanRaw,
    costModelEntriesRaw,
    scurveSettingsRaw,
    savedVersion,
    executiveSummaryResult,
  ] = await Promise.all([
    getMasterplanWithCosts(masterplanId),
    getCostModelEntries(),
    getConfiguration("scurve_settings"),
    loadMasterplanVersion(masterplanId, "v1"),
    getExecutiveSummary(masterplanId).catch(() => null),
  ]);

  if (!masterplanRaw) notFound();
  // No saved version yet → bounce to the editor so auto-save can seed v1.
  if (!savedVersion) redirect(`/costx/${masterplanId}`);

  const executiveSummary = executiveSummaryResult || "";

  // Decimals → numbers — go through unknown to silence shape mismatch
  const masterplan = convertDecimalToNumber(masterplanRaw) as unknown as {
    id: string;
    name: string;
    totalCost: number;
    grossLandArea: number;
    calculatedPlotArea: number;
    numberOfPhases?: number;
    phases?: Array<{
      phaseNumber: number;
      phaseName: string;
      startDate: string;
      totalMonths: number;
    }>;
  };
  const costModelEntries = convertDecimalToNumber(
    costModelEntriesRaw,
  ) as unknown as Parameters<typeof MasterplanSummaryClient>[0]["costModelEntries"];

  const phaseTimeline =
    masterplan.phases?.map((phase) => ({
      phaseNumber: phase.phaseNumber,
      phaseName: phase.phaseName,
      startDate: phase.startDate,
      totalMonths: phase.totalMonths,
    })) || [];

  const scurveSettings = (scurveSettingsRaw as {
    steepness: number;
    midpoint: number;
  } | null) || { steepness: 10, midpoint: 0.5 };

  return (
    <main className="flex-1 min-h-0 overflow-hidden">
      <MasterplanSummaryClient
        masterplan={{
            id: masterplan.id,
            masterplanName: masterplan.name,
            totalCost: masterplan.totalCost,
            grossLandArea: masterplan.grossLandArea,
            calculatedPlotArea: masterplan.calculatedPlotArea,
            numberOfPhases: masterplan.numberOfPhases || 1,
          }}
          version={savedVersion}
          executiveSummary={executiveSummary}
          costModelEntries={costModelEntries}
          phaseTimeline={phaseTimeline}
          scurveSettings={scurveSettings}
        />
    </main>
  );
}
