"use client";

import { Card, CardContent } from "@/components/ui/Card";
import GaugeChart from "@/components/charts/GaugeChart";
import { SingleBarHorizontalChart } from "@/components/charts/HorizontalBarChart";
import { DistributionData } from "@/lib/calculations/masterplanSummary";
import { CHART_COLORS } from "@/lib/chartColors";

interface DevelopmentEfficiencyChartsProps {
  actualFAR: number;
  targetFAR: number;
  farByAssetClass: DistributionData[];
  farByAssetType: DistributionData[];
}

export default function DevelopmentEfficiencyCharts({
  actualFAR,
  targetFAR,
  farByAssetClass,
  farByAssetType,
}: DevelopmentEfficiencyChartsProps) {
  // Calculate max for gauge
  const maxFAR = Math.max(actualFAR, targetFAR, 1) * 1.2;

  // Format FAR data for horizontal bar charts
  const farByClassData = farByAssetClass.map(item => ({
    category: item.name,
    value: item.value,
  }));

  const farByTypeData = farByAssetType.map(item => ({
    category: item.name,
    value: item.value,
  }));

  // Dynamic height based on data
  const farByClassHeight = Math.max(farByClassData.length * 28 + 40, 100);
  const farByTypeHeight = Math.max(farByTypeData.length * 28 + 40, 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left Column: FAR Gauge */}
      <Card className="bg-white h-full flex flex-col">
        <CardContent className="p-4 flex flex-col flex-1">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Development Efficiency (FAR)
          </h3>
          <div className="flex-1 flex flex-col items-center justify-center">
            <GaugeChart
              actualValue={actualFAR}
              targetValue={targetFAR}
              label="FAR"
              min={0}
              max={maxFAR}
            />
            <div className="mt-4 grid grid-cols-2 gap-8 text-center">
              <div>
                <p className="text-xs text-gray-500">Actual FAR</p>
                <p className="text-lg font-semibold text-zinc-900">
                  {actualFAR.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Target FAR</p>
                <p className="text-lg font-semibold text-gray-700">
                  {targetFAR.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAR By Asset Class */}
      <Card className="bg-white h-full flex flex-col">
        <CardContent className="p-4 flex flex-col flex-1">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            FAR By Asset Class
          </h3>
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full">
              <SingleBarHorizontalChart
                data={farByClassData}
                height={farByClassHeight}
                color={CHART_COLORS.primary}
                showSumLabels={false}
                leftMargin={10}
                yAxisWidth={80}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAR By Asset Type */}
      <Card className="bg-white h-full flex flex-col">
        <CardContent className="p-4 flex flex-col flex-1">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            FAR By Asset Type
          </h3>
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full">
              <SingleBarHorizontalChart
                data={farByTypeData}
                height={farByTypeHeight}
                color={CHART_COLORS.palette[1]}
                showSumLabels={false}
                leftMargin={10}
                yAxisWidth={80}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
