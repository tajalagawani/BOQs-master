"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { SingleBarHorizontalChart } from "@/components/charts/HorizontalBarChart";
import { NRM_CATEGORIES, CHART_COLORS } from "@/lib/chartColors";
import { CostModelData } from "@/lib/calculations/masterplanSummary";

interface CostModelAnalysisProps {
  data: CostModelData[];
  assetClasses?: string[];
  assetTypes?: string[];
  onFilterChange?: (filters: { assetClass?: string; assetType?: string }) => void;
}

export default function CostModelAnalysis({
  data,
  assetClasses = [],
  assetTypes = [],
  onFilterChange,
}: CostModelAnalysisProps) {
  const [selectedAssetClass, setSelectedAssetClass] = useState<string>("");
  const [selectedAssetType, setSelectedAssetType] = useState<string>("");

  const handleAssetClassChange = (value: string) => {
    setSelectedAssetClass(value);
    onFilterChange?.({ assetClass: value, assetType: selectedAssetType });
  };

  const handleAssetTypeChange = (value: string) => {
    setSelectedAssetType(value);
    onFilterChange?.({ assetClass: selectedAssetClass, assetType: value });
  };

  const handleClear = () => {
    setSelectedAssetClass("");
    setSelectedAssetType("");
    onFilterChange?.({ assetClass: "", assetType: "" });
  };

  // Format data for chart
  const chartData = useMemo(() => {
    return data.map(item => ({
      category: item.category,
      value: item.value,
    }));
  }, [data]);

  const hasFilters = selectedAssetClass || selectedAssetType;

  return (
    <Card className="bg-white h-full flex flex-col">
      <CardContent className="p-4 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Cost Model Analysis</h3>
          <div className="flex items-center gap-2">
            {/* Asset Class Filter */}
            <select
              value={selectedAssetClass}
              onChange={(e) => handleAssetClassChange(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
            >
              <option value="">Asset Class</option>
              {assetClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>

            {/* Asset Type Filter */}
            <select
              value={selectedAssetType}
              onChange={(e) => handleAssetTypeChange(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
            >
              <option value="">Asset Type</option>
              {assetTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            {/* Clear Button */}
            {hasFilters && (
              <button
                onClick={handleClear}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full">
            <SingleBarHorizontalChart
              data={chartData}
              height={Math.max(chartData.length * 28 + 40, 200)}
              color={CHART_COLORS.primary}
              showSumLabels={true}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Area Analysis Metrics - Simple row of 3 metrics
interface AreaAnalysisMetricsProps {
  residentialGFA: number;
  far: number;
  commercialGFA: number;
}

export function AreaAnalysisMetrics({
  residentialGFA,
  far,
  commercialGFA,
}: AreaAnalysisMetricsProps) {
  const formatArea = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="bg-white">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Area Analysis</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Residential GFA</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatArea(residentialGFA)} <span className="text-xs font-normal">m²</span>
            </p>
          </div>
          <div className="text-center p-3 bg-zinc-100 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">FAR</p>
            <p className="text-lg font-semibold text-zinc-900">{far.toFixed(2)}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Commercial GFA</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatArea(commercialGFA)} <span className="text-xs font-normal">m²</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
