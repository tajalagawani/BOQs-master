"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Search } from "lucide-react";

export interface CostFactorEntry {
  id: string;
  baseDate: string;
  costUplift: number;
}

export interface CostFactorSettings {
  referenceBaseDate: string;
  annualInflationRate: number;
}

interface CostFactorPanelProps {
  costFactors: CostFactorEntry[];
  initialSettings?: CostFactorSettings;
  onSettingsChange?: (settings: CostFactorSettings) => void;
}

// Parse base date string (e.g., "1Q25") to get quarter offset from a reference
function parseBaseDate(baseDate: string): { quarter: number; year: number } | null {
  const match = baseDate.match(/^(\d)Q(\d{2})$/);
  if (!match) return null;
  return {
    quarter: parseInt(match[1]),
    year: 2000 + parseInt(match[2]),
  };
}

// Get quarter offset from reference date
function getQuarterOffset(baseDate: string, referenceDate: string): number {
  const base = parseBaseDate(baseDate);
  const ref = parseBaseDate(referenceDate);
  if (!base || !ref) return 0;

  const baseTotal = (base.year - 2000) * 4 + base.quarter;
  const refTotal = (ref.year - 2000) * 4 + ref.quarter;
  return baseTotal - refTotal;
}

// Calculate cost uplift based on inflation rate
function calculateCostUplift(
  baseDate: string,
  referenceDate: string,
  annualInflationRate: number
): number {
  const quarterOffset = getQuarterOffset(baseDate, referenceDate);
  const quarterlyRate = annualInflationRate / 100 / 4;
  return Math.round((1 + quarterOffset * quarterlyRate) * 10000) / 10000;
}

export default function CostFactorPanel({
  costFactors,
  initialSettings,
  onSettingsChange,
}: CostFactorPanelProps) {
  const costFactorEntries = costFactors;
  const [search, setSearch] = useState("");

  // Settings state
  const [settings, setSettings] = useState<CostFactorSettings>({
    referenceBaseDate: initialSettings?.referenceBaseDate || "1Q25",
    annualInflationRate: initialSettings?.annualInflationRate ?? 2,
  });

  // Notify parent when settings change
  const handleSettingsChange = (newSettings: CostFactorSettings) => {
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  // Column resize state
  const [columnWidths, setColumnWidths] = useState<number[]>([50, 50]);
  const resizingColumnRef = useRef<number | null>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  const tableRef = useRef<HTMLTableElement>(null);

  const handleMouseDown = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault();
    resizingColumnRef.current = index;
    startXRef.current = e.clientX;
    startWidthRef.current = columnWidths[index];
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [columnWidths]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizingColumnRef.current === null || !tableRef.current) return;

      const tableWidth = tableRef.current.offsetWidth;
      const diffPx = e.clientX - startXRef.current;
      const diffPercent = (diffPx / tableWidth) * 100;
      const newWidth = Math.max(20, Math.min(80, startWidthRef.current + diffPercent));

      setColumnWidths(prev => {
        const newWidths = [...prev];
        newWidths[resizingColumnRef.current!] = newWidth;
        return newWidths;
      });
    };

    const handleMouseUp = () => {
      resizingColumnRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Filter and calculate data
  const filteredData = useMemo(() => {
    let data = costFactorEntries.map(entry => ({
      ...entry,
      calculatedUplift: calculateCostUplift(
        entry.baseDate,
        settings.referenceBaseDate,
        settings.annualInflationRate
      ),
    }));

    if (search) {
      const searchLower = search.toLowerCase();
      data = data.filter((e) =>
        e.baseDate.toLowerCase().includes(searchLower)
      );
    }

    return data;
  }, [search, costFactorEntries, settings]);

  // Get unique base dates for reference dropdown
  const baseDateOptions = useMemo(() => {
    return costFactorEntries.map(e => e.baseDate);
  }, [costFactorEntries]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-800">Cost Factor</h2>
        <p className="text-xs text-gray-500 mt-1">
          Configure inflation rate to calculate cost uplift per base date.
        </p>
      </div>

      {/* Inflation Settings */}
      <div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-end gap-6">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Reference Base Date
            </label>
            <select
              value={settings.referenceBaseDate}
              onChange={(e) => handleSettingsChange({ ...settings, referenceBaseDate: e.target.value })}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
            >
              {baseDateOptions.map(date => (
                <option key={date} value={date}>{date}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Annual Inflation Rate (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={settings.annualInflationRate}
              onChange={(e) => handleSettingsChange({ ...settings, annualInflationRate: parseFloat(e.target.value) || 0 })}
              className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4 p-3 bg-white rounded-md border border-gray-200 text-xs text-gray-600">
          <p className="font-medium text-gray-700 mb-2">How Cost Uplift Works:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li><strong>Reference Base Date</strong> — The starting point where Cost Uplift = 1.0000</li>
            <li><strong>Annual Inflation Rate</strong> — Yearly percentage increase in construction costs</li>
            <li><strong>Formula:</strong> Cost Uplift = 1 + (quarters from reference × quarterly rate)</li>
            <li><strong>Quarterly Rate:</strong> {(settings.annualInflationRate / 4).toFixed(3)}% ({settings.annualInflationRate}% ÷ 4)</li>
          </ul>
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-gray-500">
              Set inflation rate to <strong>0%</strong> to disable uplift (all values = 1.0)
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by base date..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table ref={tableRef} className="w-full text-sm border-collapse table-fixed">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr className="border-b border-gray-200">
              <th
                className="px-3 py-2.5 text-left text-sm font-medium text-gray-600 border-r border-gray-200 relative"
                style={{ width: `${columnWidths[0]}%` }}
              >
                Base Date
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-zinc-900 active:bg-zinc-900"
                  onMouseDown={(e) => handleMouseDown(0, e)}
                />
              </th>
              <th
                className="px-3 py-2.5 text-left text-sm font-medium text-gray-600 relative"
                style={{ width: `${columnWidths[1]}%` }}
              >
                Cost Uplift
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-zinc-900 active:bg-zinc-900"
                  onMouseDown={(e) => handleMouseDown(1, e)}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((entry) => (
              <tr
                key={entry.id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td
                  className="px-3 py-2 text-sm text-gray-700 border-r border-gray-100"
                  style={{ width: `${columnWidths[0]}%` }}
                >
                  {entry.baseDate}
                </td>
                <td
                  className="px-3 py-2 text-sm text-gray-700"
                  style={{ width: `${columnWidths[1]}%` }}
                >
                  {entry.calculatedUplift.toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredData.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">No data matches your search</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-200 text-xs text-gray-500">
        Showing {filteredData.length} of {costFactorEntries.length} entries
      </div>
    </div>
  );
}
