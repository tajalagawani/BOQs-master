"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { formatChartValue } from "@/lib/chartColors";
import { BuildingAsset, CarParkingAsset, AdditionalAsset, PublicRealmAsset, InfrastructureConfig, OtherCostsConfig } from "@/types/masterplan";

interface TableRowProps {
  name: string;
  gfa?: number;
  sarPerM2?: number;
  totalCost: number;
  isHeader?: boolean;
  isExpandable?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  level?: number;
}

function TableRow({
  name,
  gfa,
  sarPerM2,
  totalCost,
  isHeader,
  isExpandable,
  isExpanded,
  onToggle,
  level = 0,
}: TableRowProps) {
  const indent = level * 16;

  if (isHeader) {
    return (
      <tr className="bg-gray-50 border-b border-gray-200">
        <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">{name}</th>
        <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">GFA</th>
        <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">SAR / M²</th>
        <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">TOTAL COST</th>
      </tr>
    );
  }

  return (
    <tr
      className={`border-b border-gray-100 hover:bg-gray-50 ${isExpandable ? 'cursor-pointer' : ''}`}
      onClick={onToggle}
    >
      <td className="py-2 px-3 text-xs text-gray-900" style={{ paddingLeft: indent + 12 }}>
        <div className="flex items-center gap-1">
          {isExpandable && (
            isExpanded
              ? <ChevronDown className="h-3 w-3 text-gray-400" />
              : <ChevronRight className="h-3 w-3 text-gray-400" />
          )}
          <span className={isExpandable ? 'font-medium' : ''}>{name}</span>
        </div>
      </td>
      <td className="py-2 px-3 text-xs text-gray-700 text-right">
        {gfa !== undefined ? gfa.toLocaleString() : '—'}
      </td>
      <td className="py-2 px-3 text-xs text-gray-700 text-right">
        {sarPerM2 !== undefined ? sarPerM2.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—'}
      </td>
      <td className="py-2 px-3 text-xs text-gray-900 text-right font-medium">
        {totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </td>
    </tr>
  );
}

function SectionHeader({ title, color = "bg-zinc-900" }: { title: string; color?: string }) {
  return (
    <div className={`${color} text-white text-xs font-medium py-1.5 px-3`}>
      {title}
    </div>
  );
}

// Export type for data prop
export interface CapexBreakdownData {
  buildingAssets: BuildingAsset[];
  carParking: CarParkingAsset[];
  additionalAssets: AdditionalAsset[];
  publicRealm: PublicRealmAsset[];
  infrastructure: InfrastructureConfig | null;
  otherCosts: OtherCostsConfig | null;
}

export default function CapexBreakdownSummary({
  data,
}: { data: CapexBreakdownData }) {
  // Ensure arrays exist with defaults
  const buildingAssets = data?.buildingAssets || [];
  const carParking = data?.carParking || [];
  const additionalAssets = data?.additionalAssets || [];
  const publicRealm = data?.publicRealm || [];
  const infrastructure = data?.infrastructure || null;
  const otherCosts = data?.otherCosts || null;

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Group building assets by category
  const groupedAssets = buildingAssets.reduce((acc, asset) => {
    const category = asset.assetTypeL1 || "Other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(asset);
    return acc;
  }, {} as Record<string, BuildingAsset[]>);

  // Calculate totals for building assets
  const buildingTotals = {
    gfa: buildingAssets.reduce((sum, a) => sum + (a.totalGFA || 0), 0),
    cost: buildingAssets.reduce((sum, a) => sum + (a.finalCost || a.totalCost || 0), 0),
  };

  // Calculate parking totals
  const parkingTotals = {
    area: carParking.reduce((sum, a) => sum + (a.totalParkingArea || 0), 0),
    cost: carParking.reduce((sum, a) => sum + (a.finalCost || a.totalCost || 0), 0),
  };

  // Calculate additional asset totals
  const additionalTotals = {
    gfa: additionalAssets.reduce((sum, a) => sum + (a.plotArea * a.quantity), 0),
    cost: additionalAssets.reduce((sum, a) => sum + (a.totalCost || 0), 0),
  };

  // Calculate public realm totals
  const publicRealmTotals = {
    area: publicRealm.reduce((sum, a) => sum + (a.totalParkArea || 0), 0),
    cost: publicRealm.reduce((sum, a) => sum + (a.totalCost || 0), 0),
  };

  // Infrastructure totals
  const infraTotals = {
    lga: infrastructure?.grossLandArea || 0,
    sarPerM2: infrastructure?.sarPerM2GLA || 0,
    cost: infrastructure?.totalInfrastructureCost || 0,
  };

  // Other costs
  const softCosts = otherCosts?.softCostsAmount || 0;
  const authorityFees = otherCosts?.authorityFeesAmount || 0;
  const contingency = otherCosts?.contingencyAmount || 0;

  return (
    <Card className="bg-white overflow-hidden">
      <CardContent className="p-0">
        <h3 className="text-sm font-semibold text-gray-900 p-4 pb-2">Capex Breakdown Summary</h3>

        {/* Core Building Assets */}
        <SectionHeader title="Core Building Assets" />
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[40%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
            </colgroup>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-600"></th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">GFA</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">SAR / M²</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">TOTAL COST</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedAssets).map(([category, assets]) => {
                const isExpanded = expandedCategories.has(category);
                const categoryTotals = {
                  gfa: assets.reduce((sum, a) => sum + (a.totalGFA || 0), 0),
                  sarPerM2: assets.length > 0 ? assets.reduce((sum, a) => sum + (a.sarPerM2GFA || 0), 0) / assets.length : 0,
                  cost: assets.reduce((sum, a) => sum + (a.finalCost || a.totalCost || 0), 0),
                };

                return [
                  <tr
                    key={category}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleCategory(category)}
                  >
                    <td className="py-2 px-3 text-xs text-gray-900">
                      <div className="flex items-center gap-1">
                        {isExpanded
                          ? <ChevronDown className="h-3 w-3 text-gray-400" />
                          : <ChevronRight className="h-3 w-3 text-gray-400" />
                        }
                        <span className="font-medium">{category}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-xs text-gray-700 text-right">{categoryTotals.gfa.toLocaleString()}</td>
                    <td className="py-2 px-3 text-xs text-gray-700 text-right">{categoryTotals.sarPerM2.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className="py-2 px-3 text-xs text-gray-900 text-right font-medium">{categoryTotals.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  </tr>,
                  ...(isExpanded ? assets.map((asset, idx) => (
                    <tr key={`${category}-${idx}`} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 text-xs text-gray-900 pl-8">
                        {asset.assetTypologyL2 || asset.assetTypeL1 || "Asset"}
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-700 text-right">{(asset.totalGFA || 0).toLocaleString()}</td>
                      <td className="py-2 px-3 text-xs text-gray-700 text-right">{(asset.sarPerM2GFA || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="py-2 px-3 text-xs text-gray-900 text-right font-medium">{(asset.finalCost || asset.totalCost || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    </tr>
                  )) : [])
                ];
              })}
              <tr className="bg-gray-100 font-medium">
                <td className="py-2 px-3 text-xs text-gray-900">Total</td>
                <td className="py-2 px-3 text-xs text-gray-900 text-right">{buildingTotals.gfa.toLocaleString()}</td>
                <td className="py-2 px-3 text-xs text-gray-900 text-right">—</td>
                <td className="py-2 px-3 text-xs text-gray-900 text-right">{buildingTotals.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Car Parking */}
        <SectionHeader title="Car Parking" color="bg-zinc-900" />
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[40%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
            </colgroup>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Item</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">TOTAL PARKING AREA</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">SAR / M²</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">TOTAL COST</th>
              </tr>
            </thead>
            <tbody>
              {carParking.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="py-2 px-3 text-xs text-gray-900">{item.assetTypology || "Car Parking"}</td>
                  <td className="py-2 px-3 text-xs text-gray-700 text-right">{item.totalParkingArea?.toLocaleString()}</td>
                  <td className="py-2 px-3 text-xs text-gray-700 text-right">{item.sarPerM2?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className="py-2 px-3 text-xs text-gray-900 text-right font-medium">{(item.finalCost || item.totalCost || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-medium">
                <td className="py-2 px-3 text-xs text-gray-900">Total</td>
                <td className="py-2 px-3 text-xs text-gray-900 text-right">{parkingTotals.area.toLocaleString()}</td>
                <td className="py-2 px-3 text-xs text-gray-900 text-right">—</td>
                <td className="py-2 px-3 text-xs text-gray-900 text-right">{parkingTotals.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Additional Asset */}
        <SectionHeader title="Additional Asset" color="bg-gray-600" />
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[50%]" />
              <col className="w-[25%]" />
              <col className="w-[25%]" />
            </colgroup>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Item</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">GFA</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">TOTAL COST</th>
              </tr>
            </thead>
            <tbody>
              {additionalAssets.length === 0 ? (
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-3 text-xs text-gray-500" colSpan={3}>No additional assets</td>
                </tr>
              ) : (
                additionalAssets.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-2 px-3 text-xs text-gray-900">{item.assetTypeL1 || "Additional Asset"}</td>
                    <td className="py-2 px-3 text-xs text-gray-700 text-right">{(item.plotArea * item.quantity).toLocaleString()}</td>
                    <td className="py-2 px-3 text-xs text-gray-900 text-right font-medium">{(item.totalCost || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  </tr>
                ))
              )}
              <tr className="bg-gray-100 font-medium">
                <td className="py-2 px-3 text-xs text-gray-900">Total</td>
                <td className="py-2 px-3 text-xs text-gray-900 text-right">{additionalTotals.gfa.toLocaleString()}</td>
                <td className="py-2 px-3 text-xs text-gray-900 text-right">{additionalTotals.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Public Realm */}
        <SectionHeader title="Public Realm" color="bg-zinc-900" />
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[40%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
            </colgroup>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Item</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">Area</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">SAR / M²</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">TOTAL COST</th>
              </tr>
            </thead>
            <tbody>
              {publicRealm.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="py-2 px-3 text-xs text-gray-900">{item.assetTypeL1 || "Public Realm"}</td>
                  <td className="py-2 px-3 text-xs text-gray-700 text-right">{item.totalParkArea?.toLocaleString()}</td>
                  <td className="py-2 px-3 text-xs text-gray-700 text-right">{item.sarPerM2?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className="py-2 px-3 text-xs text-gray-900 text-right font-medium">{(item.totalCost || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-medium">
                <td className="py-2 px-3 text-xs text-gray-900">Total</td>
                <td className="py-2 px-3 text-xs text-gray-900 text-right">{publicRealmTotals.area.toLocaleString()}</td>
                <td className="py-2 px-3 text-xs text-gray-900 text-right">—</td>
                <td className="py-2 px-3 text-xs text-gray-900 text-right">{publicRealmTotals.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Infrastructure */}
        <SectionHeader title="Infrastructure" color="bg-orange-500" />
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[40%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
            </colgroup>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Phase</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">LGA</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">SAR / M²</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">TOTAL COST</th>
              </tr>
            </thead>
            <tbody>
              {infrastructure ? (
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-3 text-xs text-gray-900">{infrastructure.phase || "Phase 1"}</td>
                  <td className="py-2 px-3 text-xs text-gray-700 text-right">{infraTotals.lga.toLocaleString()}</td>
                  <td className="py-2 px-3 text-xs text-gray-700 text-right">{infraTotals.sarPerM2.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className="py-2 px-3 text-xs text-gray-900 text-right font-medium">{infraTotals.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                </tr>
              ) : (
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-3 text-xs text-gray-500" colSpan={4}>No infrastructure data</td>
                </tr>
              )}
              <tr className="bg-gray-100 font-medium">
                <td className="py-2 px-3 text-xs text-gray-900">Total</td>
                <td className="py-2 px-3 text-xs text-gray-900 text-right">{infraTotals.lga.toLocaleString()}</td>
                <td className="py-2 px-3 text-xs text-gray-900 text-right">—</td>
                <td className="py-2 px-3 text-xs text-gray-900 text-right">{infraTotals.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Other Costs */}
        <SectionHeader title="Other Costs" color="bg-purple-600" />
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[50%]" />
              <col className="w-[25%]" />
              <col className="w-[25%]" />
            </colgroup>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">COST TYPE</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">PERCENTAGE VALUE</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">TOTAL COST</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3 text-xs text-gray-900">Soft Costs</td>
                <td className="py-2 px-3 text-xs text-gray-700 text-right">{otherCosts?.softCostsPercentage || 0} %</td>
                <td className="py-2 px-3 text-xs text-gray-900 text-right font-medium">{softCosts.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3 text-xs text-gray-900">Authority Fees</td>
                <td className="py-2 px-3 text-xs text-gray-700 text-right">{otherCosts?.authorityFeesPercentage || 0} %</td>
                <td className="py-2 px-3 text-xs text-gray-900 text-right font-medium">{authorityFees.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3 text-xs text-gray-900">Contingency</td>
                <td className="py-2 px-3 text-xs text-gray-700 text-right">{otherCosts?.contingencyPercentage || 0} %</td>
                <td className="py-2 px-3 text-xs text-gray-900 text-right font-medium">{contingency.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
              </tr>
              <tr className="bg-gray-100 font-medium">
                <td className="py-2 px-3 text-xs text-gray-900">Total</td>
                <td className="py-2 px-3 text-xs text-gray-900 text-right">—</td>
                <td className="py-2 px-3 text-xs text-gray-900 text-right">{(softCosts + authorityFees + contingency).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Grand Total */}
        <div className="bg-zinc-900 text-white p-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Total</span>
            <span className="text-sm font-bold">
              SAR {(
                buildingTotals.cost +
                parkingTotals.cost +
                additionalTotals.cost +
                publicRealmTotals.cost +
                infraTotals.cost +
                softCosts +
                authorityFees +
                contingency
              ).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
