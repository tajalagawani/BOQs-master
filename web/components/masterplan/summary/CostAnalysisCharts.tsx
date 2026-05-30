"use client";

import MiniPieChart from "@/components/charts/MiniPieChart";
import { DistributionData } from "@/lib/calculations/masterplanSummary";
import { CHART_COLORS } from "@/lib/chartColors";

interface CostAnalysisChartsProps {
  costByAssetClass: DistributionData[];
  costByPhase: DistributionData[];
  costByAssetType: DistributionData[];
  phases?: string[];
  assetClasses?: string[];
  assetTypes?: string[];
}

export default function CostAnalysisCharts({
  costByAssetClass,
  costByPhase,
  costByAssetType,
}: CostAnalysisChartsProps) {
  // Filter out items with empty names or zero values
  const filterData = (data: DistributionData[]) =>
    data.filter(item => item.name && item.name.trim() !== "" && item.name !== "Unknown" && item.value > 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <MiniPieChart
        title="Cost By Asset Class"
        data={filterData(costByAssetClass).map((item, index) => ({
          name: item.name,
          value: item.value,
          color: CHART_COLORS.palette[index % CHART_COLORS.palette.length],
        }))}
        donut={true}
      />

      <MiniPieChart
        title="Costs By Phase"
        data={filterData(costByPhase).map((item, index) => ({
          name: item.name,
          value: item.value,
          color: index === 0 ? CHART_COLORS.primary : CHART_COLORS.palette[index + 1],
        }))}
        donut={true}
      />

      <MiniPieChart
        title="Cost By Asset Type"
        data={filterData(costByAssetType).map((item, index) => ({
          name: item.name,
          value: item.value,
          color: CHART_COLORS.palette[index % CHART_COLORS.palette.length],
        }))}
        donut={true}
      />
    </div>
  );
}
