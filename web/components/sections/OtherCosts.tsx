"use client";

import Accordion from "@/components/Accordion";
import { formatNumber } from "@/utils/formatters";
import type { OtherCostsConfig } from "@/types/masterplan";

interface Props {
  config: OtherCostsConfig;
  totalConstructionCost: number;
  onUpdatePercentage?: (field: string, value: number) => void;
}

export default function OtherCosts({
  config,
  totalConstructionCost,
  onUpdatePercentage,
}: Props) {
  const totalOtherCosts =
    (config.contingencyAmount || 0) +
    (config.authorityFeesAmount || 0) +
    (config.softCostsAmount || 0);

  const handlePctChange = (field: string, value: string) => {
    const num = parseFloat(value) || 0;
    onUpdatePercentage?.(field, num);
  };

  return (
    <Accordion title="Other Costs" totalCost={totalOtherCosts}>
      <div className="mt-4">
        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-1.5">
            Percentage-Based Calculation
          </h4>
          <p className="text-xs text-blue-800">
            All costs are calculated as percentages of the Total Construction
            Cost. Each cost is calculated independently (no overlapping).
          </p>
          <div className="mt-2 text-xs text-blue-800">
            <strong>Base Cost:</strong>{" "}
            {formatNumber(totalConstructionCost)} SAR
          </div>
        </div>

        {/* Costs table */}
        <div className="border border-zinc-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 border-b border-zinc-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
                  Cost Type
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
                  Description
                </th>
                <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-600 w-32">
                  Percentage (%)
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-600 w-40">
                  Amount (SAR)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-zinc-100">
              <Row
                label="Contingency"
                description="Risk allowance for unforeseen costs"
                percentage={config.contingencyPercentage || 0}
                amount={config.contingencyAmount || 0}
                onChange={(v) => handlePctChange("contingencyPercentage", v)}
              />
              <Row
                label="Authority Fees"
                description="Government permits and regulatory fees"
                percentage={config.authorityFeesPercentage || 0}
                amount={config.authorityFeesAmount || 0}
                onChange={(v) => handlePctChange("authorityFeesPercentage", v)}
              />
              <Row
                label="Soft Costs"
                description="Professional fees (architects, engineers, etc.)"
                percentage={config.softCostsPercentage || 0}
                amount={config.softCostsAmount || 0}
                onChange={(v) => handlePctChange("softCostsPercentage", v)}
              />
            </tbody>

            <tfoot className="bg-zinc-50 border-t-2 border-zinc-300">
              <tr>
                <td
                  colSpan={2}
                  className="px-4 py-2.5 font-semibold text-zinc-900 text-sm"
                >
                  Total Other Costs
                </td>
                <td className="px-4 py-2.5 text-center font-semibold text-zinc-600 text-sm">
                  {(
                    (config.contingencyPercentage || 0) +
                    (config.authorityFeesPercentage || 0) +
                    (config.softCostsPercentage || 0)
                  ).toFixed(1)}{" "}
                  %
                </td>
                <td className="px-4 py-2.5 text-right font-semibold text-zinc-900 tabular-nums text-sm">
                  {formatNumber(totalOtherCosts)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Totals summary */}
        <div className="mt-4 p-4 bg-zinc-900 text-white rounded-xl">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium">
                Total Project Cost (Construction + Other Costs)
              </p>
              <p className="text-[11px] text-white/70 mt-0.5">
                {formatNumber(totalConstructionCost)} +{" "}
                {formatNumber(totalOtherCosts)} SAR
              </p>
            </div>
            <p className="text-xl font-bold tracking-tight">
              {formatNumber(totalConstructionCost + totalOtherCosts)} SAR
            </p>
          </div>
        </div>
      </div>
    </Accordion>
  );
}

function Row({
  label,
  description,
  percentage,
  amount,
  onChange,
}: {
  label: string;
  description: string;
  percentage: number;
  amount: number;
  onChange: (v: string) => void;
}) {
  return (
    <tr className="hover:bg-zinc-50">
      <td className="px-4 py-3 text-sm font-medium text-zinc-900">{label}</td>
      <td className="px-4 py-3 text-xs text-zinc-500">{description}</td>
      <td className="px-4 py-3">
        <input
          type="number"
          step="0.1"
          min="0"
          max="100"
          value={percentage}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-2 py-1.5 text-center text-sm border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
        />
      </td>
      <td className="px-4 py-3 text-right text-sm font-medium text-zinc-900 tabular-nums">
        {formatNumber(amount)}
      </td>
    </tr>
  );
}
