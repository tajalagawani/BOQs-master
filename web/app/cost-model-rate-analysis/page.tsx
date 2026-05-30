export const dynamic = "force-dynamic";

import { Header } from "@/components/Header";
import {
  getCostModelEntries,
  getCostModelStats,
} from "@/lib/queries/configuration";
import { branding } from "@/config/branding";
import CostModelAnalysisClient from "@/components/cost-model/CostModelAnalysisClient";

type Entry = Awaited<ReturnType<typeof getCostModelEntries>>[number];

function colorByIndex(i: number) {
  const colors = ["#424242", branding.colors.primary, "#2a9d8f", "#8dd3c7", "#1976d2", "#e0e0e0"];
  return colors[i % colors.length];
}

export default async function CostModelRateAnalysisPage() {
  const [entries, stats] = await Promise.all([
    getCostModelEntries(),
    getCostModelStats(),
  ]);

  const sar = (e: Entry) => Number(e.sarPerUoM ?? 0);

  const allCosts = entries.map(sar);
  const minCost = allCosts.length ? Math.min(...allCosts) : 0;
  const maxCost = allCosts.length ? Math.max(...allCosts) : 0;
  const avgCost = allCosts.length
    ? Math.round(allCosts.reduce((s, c) => s + c, 0) / allCosts.length)
    : 0;

  const summaryStats = {
    numberOfAssetClasses: stats.totalAssetClasses,
    numberOfAssetTypes: new Set(entries.map((e) => e.assetTypeL1)).size,
    minCostGFA: Math.round(minCost),
    maxCostGFA: Math.round(maxCost),
    avgCostGFA: avgCost,
    completionPercent: 100,
  };

  const assetClasses = [...new Set(entries.map((e) => e.assetClass))].sort();
  const nrmCategories = [...new Set(entries.map((e) => e.nrmLvl1))].sort();

  // Asset class × NRM totals
  const assetClassData: Record<string, Record<string, number>> = {};
  for (const e of entries) {
    assetClassData[e.assetClass] ??= {};
    assetClassData[e.assetClass][e.nrmLvl1] =
      (assetClassData[e.assetClass][e.nrmLvl1] ?? 0) + sar(e);
  }
  const assetClassChartData = nrmCategories.map((nrm) => {
    const point: Record<string, string | number> = { category: nrm };
    for (const ac of assetClasses) {
      point[ac] = Math.round(assetClassData[ac]?.[nrm] ?? 0);
    }
    return point;
  });

  // Asset type names by class
  const assetTypeNamesByClass: Record<string, string[]> = {};
  for (const ac of assetClasses) {
    assetTypeNamesByClass[ac] = [
      ...new Set(entries.filter((e) => e.assetClass === ac).map((e) => e.assetTypeL1)),
    ].sort();
  }

  // Asset type × NRM totals by class
  const assetTypeDataByClass: Record<
    string,
    { category: string; values: { name: string; value: number; color: string }[] }[]
  > = {};
  for (const ac of assetClasses) {
    const types = assetTypeNamesByClass[ac];
    const typeData: Record<string, Record<string, number>> = {};
    for (const e of entries.filter((x) => x.assetClass === ac)) {
      typeData[e.nrmLvl1] ??= {};
      typeData[e.nrmLvl1][e.assetTypeL1] =
        (typeData[e.nrmLvl1][e.assetTypeL1] ?? 0) + sar(e);
    }
    assetTypeDataByClass[ac] = nrmCategories.map((nrm) => ({
      category: nrm,
      values: types.map((t, i) => ({
        name: t,
        value: Math.round(typeData[nrm]?.[t] ?? 0),
        color: colorByIndex(i),
      })),
    }));
  }

  // Asset form (L2) × NRM totals by class + type
  const assetFormDataByType: Record<
    string,
    Record<
      string,
      {
        category: string;
        values: { name: string; value: number; color: string }[];
        assetForms: string[];
      }[]
    >
  > = {};
  for (const ac of assetClasses) {
    assetFormDataByType[ac] = {};
    for (const at of assetTypeNamesByClass[ac]) {
      const forms = [
        ...new Set(
          entries
            .filter((e) => e.assetClass === ac && e.assetTypeL1 === at && e.assetFormL2)
            .map((e) => e.assetFormL2!),
        ),
      ];
      if (forms.length === 0) continue;
      const formData: Record<string, Record<string, number>> = {};
      for (const e of entries.filter(
        (x) => x.assetClass === ac && x.assetTypeL1 === at && x.assetFormL2,
      )) {
        formData[e.nrmLvl1] ??= {};
        formData[e.nrmLvl1][e.assetFormL2!] =
          (formData[e.nrmLvl1][e.assetFormL2!] ?? 0) + sar(e);
      }
      assetFormDataByType[ac][at] = nrmCategories.map((nrm) => ({
        category: nrm,
        values: forms.map((f, i) => ({
          name: f,
          value: Math.round(formData[nrm]?.[f] ?? 0),
          color: colorByIndex(i),
        })),
        assetForms: forms,
      }));
    }
  }

  return (
    <>
      <Header />
      <main className="flex-1 min-h-0 overflow-auto">
        <CostModelAnalysisClient
          summaryStats={summaryStats}
          assetClassChartData={assetClassChartData}
          assetClasses={assetClasses}
          nrmCategories={nrmCategories}
          assetTypeDataByClass={assetTypeDataByClass}
          assetTypeNamesByClass={assetTypeNamesByClass}
          assetFormDataByType={assetFormDataByType}
        />
      </main>
    </>
  );
}
