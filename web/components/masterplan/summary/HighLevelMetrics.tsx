"use client";

import { Card, CardContent } from "@/components/ui/Card";
import { formatChartValue } from "@/lib/chartColors";

export interface HighLevelMetricsData {
  totalGLA: number;
  far: number;
  phases: number;
  plotArea: number;
  gfa: number;
  approvedBudget: number;
  buaForParking: number;
  baseDate: string;
  constructionCostHard: number;
  totalBUA: number;
  builtAssetsCost: number;
  totalConstructionCost: number;
  totalPlotAreaForBuildings: number;
  infraPRCost: number;
  variance: number;
}

interface HighLevelMetricsProps {
  data: HighLevelMetricsData;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  highlight?: boolean;
}

function MetricCard({ label, value, subValue, highlight }: MetricCardProps) {
  return (
    <div className={`p-3 rounded-lg ${highlight ? 'bg-zinc-100' : 'bg-gray-50'}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? 'text-zinc-900' : 'text-gray-900'}`}>
        {value}
      </p>
      {subValue && (
        <p className="text-xs text-gray-400 mt-0.5">{subValue}</p>
      )}
    </div>
  );
}

export default function HighLevelMetrics({ data }: HighLevelMetricsProps) {
  const metrics = [
    // Row 1
    { label: "Total GLA", value: formatChartValue(data.totalGLA, 'area') },
    { label: "FAR", value: data.far.toFixed(2) },
    { label: "# Phases", value: data.phases.toString() },

    // Row 2
    { label: "Plot Area", value: formatChartValue(data.plotArea, 'area') },
    { label: "GFA", value: formatChartValue(data.gfa, 'area') },
    { label: "Approved Budget", value: formatChartValue(data.approvedBudget, 'currency'), highlight: true },

    // Row 3
    { label: "BUA For Parking", value: formatChartValue(data.buaForParking, 'area') },
    { label: "Base Date", value: data.baseDate || "—" },
    { label: "Construction Cost (Hard Cost)", value: formatChartValue(data.constructionCostHard, 'currency') },

    // Row 4
    { label: "Total BUA For The Development", value: formatChartValue(data.totalBUA, 'area') },
    { label: "Built Assets Cost", value: formatChartValue(data.builtAssetsCost, 'currency') },
    { label: "Total Construction Cost (Including Soft Cost)", value: formatChartValue(data.totalConstructionCost, 'currency'), highlight: true },

    // Row 5
    { label: "Total Plot Area For Building Assets", value: formatChartValue(data.totalPlotAreaForBuildings, 'area') },
    { label: "Infra, PR Cost", value: formatChartValue(data.infraPRCost, 'currency') },
    { label: "Variance", value: formatChartValue(data.variance, 'currency'), highlight: data.variance < 0 },
  ];

  return (
    <Card className="bg-white">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Masterplan High Level</h3>
        <div className="grid grid-cols-3 gap-2">
          {metrics.map((metric, index) => (
            <MetricCard
              key={index}
              label={metric.label}
              value={metric.value}
              highlight={metric.highlight}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
