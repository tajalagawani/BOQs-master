"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import HorizontalBarChart from "@/components/charts/HorizontalBarChart";
import { branding } from "@/config/branding";
import {
  SuiteInnerShell,
  SuiteInnerHeader,
  SuiteTiles,
  SuiteButton,
  type SuiteTileData,
} from "@/components/suite";

interface SummaryStats {
  numberOfAssetClasses: number;
  numberOfAssetTypes: number;
  minCostGFA: number;
  maxCostGFA: number;
  avgCostGFA: number;
  completionPercent: number;
}

interface Props {
  summaryStats: SummaryStats;
  assetClassChartData: any[];
  assetClasses: string[];
  nrmCategories: string[];
  assetTypeDataByClass: Record<string, any[]>;
  assetTypeNamesByClass: Record<string, string[]>;
  assetFormDataByType: Record<string, Record<string, any[]>>;
}

// Asset Class colors (using brand colors)
const assetClassColors: Record<string, string> = {
  "Community Building": branding.colors.primary,
  "Retail": "#e91e63",
  "Commercial": "#9e9e9e",
  "Residential": "#f8bbd9",
};

// Asset Type colors (using brand colors)
const assetTypeColors: Record<string, string> = {
  "Neighborhood Centre": "#424242",
  "District Centre Community Mall": branding.colors.primary,
  "Mixed Use Retail": "#2a9d8f",
  "Outlet Mall": "#8dd3c7",
  "Lifestyle Retail": "#1976d2",
  "Regional Mall": "#e0e0e0",
  "Villa": "#424242",
  "Townhouse": branding.colors.primary,
  "Apartment Low Rise": "#2a9d8f",
  "Apartment Mid Rise": "#8dd3c7",
  "Apartment High Rise": "#1976d2",
  "Office Low Rise": "#424242",
  "Office Mid Rise": branding.colors.primary,
  "Office High Rise": "#2a9d8f",
  "Mixed Use": "#8dd3c7",
  "Mosque": "#424242",
  "School": branding.colors.primary,
  "Healthcare": "#2a9d8f",
  "Recreation": "#8dd3c7",
};

export default function CostModelAnalysisClient({
  summaryStats,
  assetClassChartData,
  assetClasses,
  nrmCategories,
  assetTypeDataByClass,
  assetTypeNamesByClass,
  assetFormDataByType,
}: Props) {
  const [search, setSearch] = useState("");
  const [selectedAssetClass, setSelectedAssetClass] = useState<string>(assetClasses[0] || "Retail");
  const [selectedAssetType, setSelectedAssetType] = useState<string | null>(null);
  const [stackMode, setStackMode] = useState<"nrm" | "assetType">("nrm");

  // Reverse NRM categories for horizontal bar chart (bottom to top)
  const reversedNrmCategories = [...nrmCategories].reverse();

  // Transform data for left chart (horizontal bars, all asset classes)
  const leftChartData = reversedNrmCategories.map((nrm) => {
    const dataPoint: any = { category: nrm };
    assetClasses.forEach((assetClass) => {
      const found = assetClassChartData.find((d) => d.category === nrm);
      dataPoint[assetClass] = found?.[assetClass] || 0;
    });
    return dataPoint;
  });

  // Transform data for right chart (horizontal bars, selected asset type)
  const currentAssetTypeData = assetTypeDataByClass[selectedAssetClass] || [];
  const currentAssetTypeNames = assetTypeNamesByClass[selectedAssetClass] || [];

  // Filter to only show specific NRM categories for right chart
  const rightNRMCategories = [
    "Conveying Systems",
    "Electrical Services",
    "Sanitary Fittings",
    "FF&E",
    "Internal Walls & Doors",
    "Superstructure",
    "Facilitating Works",
  ].filter(cat => nrmCategories.includes(cat)).reverse();

  const rightChartData = rightNRMCategories.map((nrm) => {
    const found = currentAssetTypeData.find((d) => d.category === nrm);
    const dataPoint: any = { category: nrm };

    if (found) {
      found.values.forEach((v: any) => {
        dataPoint[v.name] = v.value;
      });
    }

    return dataPoint;
  });

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleAssetTypeClick = (assetType: string) => {
    setSelectedAssetType(assetType);
  };

  // Summary cards → suite tiles (same labels, values and order).
  const tiles: SuiteTileData[] = [
    { k: "Number Of Asset Classes:", v: summaryStats.numberOfAssetClasses },
    { k: "Number Of Asset Types:", v: summaryStats.numberOfAssetTypes },
    { k: "Min Cost/GFA:", v: `SAR ${summaryStats.minCostGFA}` },
    { k: "Max Cost/GFA:", v: `SAR ${formatNumber(summaryStats.maxCostGFA)}` },
    { k: "Average Cost/GFA:", v: `SAR ${formatNumber(summaryStats.avgCostGFA)}` },
    {
      k: "Completion Percent:",
      v: `${summaryStats.completionPercent.toFixed(2)}%`,
    },
  ];

  return (
    <SuiteInnerShell
      crumb={<span className="font-semibold text-[#cdd6e6]">Rate Analysis</span>}
      search={search}
      onSearch={setSearch}
      header={
        <SuiteInnerHeader
          title="Cost Model Analysis Dashboard"
          actions={
            <SuiteButton onClick={handleRefresh}>
              <RefreshCw className="size-4" strokeWidth={2} />
              Refresh
            </SuiteButton>
          }
        />
      }
    >
      <div className="p-1">
        {/* Summary tiles */}
        <SuiteTiles items={tiles} cols={6} className="mb-4" />

        {/* Main Charts Area */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Left Section - Asset Class Chart */}
          <div className="min-w-0 rounded-[14px] border border-suite-line bg-suite-card-soft p-4">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-suite-ink">Average Cost/GFA By Asset Class (SAR)</h2>
            </div>

            <HorizontalBarChart
              data={leftChartData}
              dataKeys={assetClasses}
              colors={assetClassColors}
              height={700}
              onBarClick={(assetClass) => setSelectedAssetClass(assetClass)}
              stacked={true}
            />
          </div>

          {/* Right Section - Asset Type Charts */}
          <div className="min-w-0 rounded-[14px] border border-suite-line bg-suite-card-soft p-4">
            {/* Asset Class Selector */}
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-sm font-semibold text-suite-ink">
                Average Cost/GFA By Asset Type (L1) - {selectedAssetClass}
              </h2>
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => setStackMode("nrm")}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    stackMode === "nrm"
                      ? "bg-suite-btn text-white"
                      : "bg-suite-neut-bg text-suite-ink-2"
                  }`}
                >
                  Stack by NRM
                </button>
                <button
                  onClick={() => setStackMode("assetType")}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    stackMode === "assetType"
                      ? "bg-suite-btn text-white"
                      : "bg-suite-neut-bg text-suite-ink-2"
                  }`}
                >
                  Stack by Asset Type
                </button>
              </div>
            </div>

            {/* Asset Class Buttons */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {assetClasses.map((assetClass) => (
                <button
                  key={assetClass}
                  onClick={() => setSelectedAssetClass(assetClass)}
                  className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                    selectedAssetClass === assetClass
                      ? "bg-suite-btn text-white"
                      : "bg-suite-neut-bg text-suite-ink-2 hover:bg-suite-line"
                  }`}
                >
                  {assetClass}
                </button>
              ))}
            </div>

            {/* Asset Type Chart */}
            <HorizontalBarChart
              data={rightChartData}
              dataKeys={currentAssetTypeNames}
              colors={assetTypeColors}
              height={500}
              onBarClick={(typeName) => handleAssetTypeClick(typeName)}
              stacked={true}
            />

            {/* Legend */}
            <div className="mt-6 rounded-[12px] border border-suite-line bg-suite-panel p-4">
              <p className="text-xs font-semibold text-suite-ink-2 mb-3">Legend</p>
              <div className="grid grid-cols-3 gap-3">
                {currentAssetTypeNames.map((typeName) => (
                  <div key={typeName} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: assetTypeColors[typeName] || "#999" }}
                    />
                    <span className="text-xs text-suite-ink-2">{typeName}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Asset Form (L2) Chart - Shows when Asset Type is selected */}
            {selectedAssetType ? (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-suite-ink-2">
                    Average Cost/GFA By Asset Form (L2) - {selectedAssetType}
                  </h3>
                  <button
                    onClick={() => setSelectedAssetType(null)}
                    className="px-3 py-1 text-xs font-medium text-suite-ink-2 bg-suite-neut-bg hover:bg-suite-line rounded-full transition-colors"
                  >
                    Close
                  </button>
                </div>

                {(() => {
                  const assetFormData = assetFormDataByType[selectedAssetClass]?.[selectedAssetType];

                  if (!assetFormData || assetFormData.length === 0) {
                    return (
                      <div className="rounded-[12px] border border-suite-warn-bg bg-suite-warn-bg p-4">
                        <p className="text-sm text-suite-ink-2">
                          No Asset Form (L2) data available for <strong>{selectedAssetType}</strong>
                        </p>
                      </div>
                    );
                  }

                  const assetForms = assetFormData[0]?.assetForms || [];
                  const formChartData = rightNRMCategories.map((nrm) => {
                    const found = assetFormData.find((d) => d.category === nrm);
                    const dataPoint: any = { category: nrm };

                    if (found) {
                      found.values.forEach((v: any) => {
                        dataPoint[v.name] = v.value;
                      });
                    }

                    return dataPoint;
                  });

                  // Create colors mapping for asset forms
                  const assetFormColors = assetForms.reduce((acc: Record<string, string>, form: string, index: number) => {
                    acc[form] = `hsl(${index * 60}, 70%, 50%)`;
                    return acc;
                  }, {} as Record<string, string>);

                  return (
                    <div>
                      <HorizontalBarChart
                        data={formChartData}
                        dataKeys={assetForms}
                        colors={assetFormColors}
                        height={400}
                        stacked={true}
                      />

                      {/* Asset Forms Legend */}
                      <div className="mt-4 rounded-[12px] border border-suite-line bg-suite-panel p-4">
                        <p className="text-xs font-semibold text-suite-ink-2 mb-3">Asset Forms</p>
                        <div className="grid grid-cols-2 gap-3">
                          {assetForms.map((form: string, index: number) => (
                            <div key={form} className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }}
                              />
                              <span className="text-xs text-suite-ink-2">{form}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="mt-6 rounded-[12px] border border-suite-blue-soft bg-suite-blue-soft p-4">
                <h3 className="text-sm font-semibold text-suite-ink-2 mb-1">
                  Average Cost/GFA By Asset Form (L2)
                </h3>
                <p className="text-xs text-suite-ink-2">
                  Click any bar in the Average Cost/GFA By Asset Type (L1) chart above to view the drilldown by Asset Form (L2)
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </SuiteInnerShell>
  );
}
