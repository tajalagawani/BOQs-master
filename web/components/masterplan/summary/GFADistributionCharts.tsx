"use client";

import MiniPieChart from "@/components/charts/MiniPieChart";
import { DistributionData } from "@/lib/calculations/masterplanSummary";
import { CHART_COLORS } from "@/lib/chartColors";

interface GFADistributionChartsProps {
  gfaByAssetClass: DistributionData[];
  gfaByAssetType: DistributionData[];
  gfaByTypology: DistributionData[];
  gfaByPricePoint: DistributionData[];
}

export default function GFADistributionCharts({
  gfaByAssetClass,
  gfaByAssetType,
  gfaByTypology,
  gfaByPricePoint,
}: GFADistributionChartsProps) {
  // Filter out items with empty names or zero values
  const filterData = (data: DistributionData[]) =>
    data.filter(item => item.name && item.name.trim() !== "" && item.name !== "Unknown" && item.value > 0);

  return (
    <>
      <MiniPieChart
        title="GFA By Asset Class"
        data={filterData(gfaByAssetClass).map((item, index) => ({
          name: item.name,
          value: item.value,
          color: CHART_COLORS.palette[index % CHART_COLORS.palette.length],
        }))}
        donut={true}
      />

      <MiniPieChart
        title="GFA By Asset Type"
        data={filterData(gfaByAssetType).map((item, index) => ({
          name: item.name,
          value: item.value,
          color: CHART_COLORS.palette[index % CHART_COLORS.palette.length],
        }))}
        donut={true}
      />

      <MiniPieChart
        title="GFA By Typology"
        data={filterData(gfaByTypology).map((item, index) => ({
          name: item.name,
          value: item.value,
          color: CHART_COLORS.palette[index % CHART_COLORS.palette.length],
        }))}
        donut={true}
      />

      <MiniPieChart
        title="GFA By Price Point"
        data={filterData(gfaByPricePoint).map((item, index) => ({
          name: item.name,
          value: item.value,
          color: CHART_COLORS.palette[index % CHART_COLORS.palette.length],
        }))}
        donut={true}
      />
    </>
  );
}
