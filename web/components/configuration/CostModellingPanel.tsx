"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Search, X, Download, ChevronDown, ChevronUp } from "lucide-react";
import { CostModelEntry } from "@/types/costModel";
import { formatNumber } from "@/utils/formatters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import CostModelImportExport from "./CostModelImportExport";

interface CostModelFilters {
  search: string;
  assetClass: string;
  assetTypeL1: string;
  nrmLvl1: string;
  rcdcMin: string;
  rcdcMax: string;
  benchmarkMin: string;
  benchmarkMax: string;
  showOnly: "all" | "withValues" | "empty";
}

interface CostModellingPanelProps {
  costModelEntries: CostModelEntry[];
  selectedAssetClass?: string;
  selectedAssetTypeL1?: string;
  selectedAssetFormL2?: string;
  selectedPricePoint?: string;
  onRefresh?: () => void;
}

export default function CostModellingPanel({
  costModelEntries,
  selectedAssetClass,
  selectedAssetTypeL1,
  selectedAssetFormL2,
  selectedPricePoint,
  onRefresh,
}: CostModellingPanelProps) {
  // Generate dropdown options from entries
  const assetClassOptions = useMemo(() => {
    const classes = new Set<string>();
    costModelEntries.forEach((e) => {
      if (e.assetClass && e.assetClass !== "-") classes.add(e.assetClass);
    });
    return Array.from(classes).sort();
  }, [costModelEntries]);

  const assetTypeL1Options = useMemo(() => {
    const types = new Set<string>();
    costModelEntries.forEach((e) => {
      if (e.assetTypeL1 && e.assetTypeL1 !== "-") types.add(e.assetTypeL1);
    });
    return Array.from(types).sort();
  }, [costModelEntries]);

  const nrmLvl1Options = useMemo(() => {
    const nrms = new Set<string>();
    costModelEntries.forEach((e) => {
      if (e.nrmLvl1 && e.nrmLvl1 !== "-") nrms.add(e.nrmLvl1);
    });
    return Array.from(nrms).sort();
  }, [costModelEntries]);
  const [filters, setFilters] = useState<CostModelFilters>({
    search: "",
    assetClass: "",
    assetTypeL1: "",
    nrmLvl1: "",
    rcdcMin: "",
    rcdcMax: "",
    benchmarkMin: "",
    benchmarkMax: "",
    showOnly: "all",
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [editedValues, setEditedValues] = useState<
    Record<string, { rcdc?: number | null; benchmarked?: number | null; bua?: number | null; gia?: number | null; gfa?: number | null }>
  >({});

  // Column resize state - using percentages for responsive layout
  const [columnWidths, setColumnWidths] = useState<number[]>([
    4,    // #
    11,   // Asset Class
    11,   // Asset Type (L1)
    11,   // Asset Form (L2)
    9,    // Price Point
    9,    // NRM Lvl 1
    9,    // RCDC Cost/GFA
    9,    // Benchmarked Cost/GFA
    9,    // BUA
    9,    // GIA
    9,    // GFA
  ]);
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
      const newWidth = Math.max(3, Math.min(50, startWidthRef.current + diffPercent));

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

  // Apply filters and tree selection
  const filteredData = useMemo(() => {
    let data = [...costModelEntries];

    // Apply tree selection filters
    if (selectedAssetClass) {
      data = data.filter((e) => e.assetClass === selectedAssetClass);
    }
    if (selectedAssetTypeL1) {
      data = data.filter((e) => e.assetTypeL1 === selectedAssetTypeL1);
    }
    if (selectedAssetFormL2) {
      data = data.filter((e) => e.assetFormL2 === selectedAssetFormL2);
    }
    if (selectedPricePoint) {
      data = data.filter((e) => e.pricePoint === selectedPricePoint);
    }

    // Apply dropdown filters
    if (filters.assetClass) {
      data = data.filter((e) => e.assetClass === filters.assetClass);
    }
    if (filters.assetTypeL1) {
      data = data.filter((e) => e.assetTypeL1 === filters.assetTypeL1);
    }
    if (filters.nrmLvl1) {
      data = data.filter((e) => e.nrmLvl1 === filters.nrmLvl1);
    }

    // Apply search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      data = data.filter(
        (e) =>
          e.assetClass.toLowerCase().includes(searchLower) ||
          e.assetTypeL1.toLowerCase().includes(searchLower) ||
          e.assetFormL2.toLowerCase().includes(searchLower) ||
          e.pricePoint.toLowerCase().includes(searchLower) ||
          e.nrmLvl1.toLowerCase().includes(searchLower)
      );
    }

    // Apply advanced filters
    if (filters.rcdcMin) {
      const min = parseFloat(filters.rcdcMin);
      if (!isNaN(min)) {
        data = data.filter((e) => e.rcdcCostGfa !== null && e.rcdcCostGfa >= min);
      }
    }
    if (filters.rcdcMax) {
      const max = parseFloat(filters.rcdcMax);
      if (!isNaN(max)) {
        data = data.filter((e) => e.rcdcCostGfa !== null && e.rcdcCostGfa <= max);
      }
    }
    if (filters.benchmarkMin) {
      const min = parseFloat(filters.benchmarkMin);
      if (!isNaN(min)) {
        data = data.filter(
          (e) => e.benchmarkedCostGfa !== null && e.benchmarkedCostGfa >= min
        );
      }
    }
    if (filters.benchmarkMax) {
      const max = parseFloat(filters.benchmarkMax);
      if (!isNaN(max)) {
        data = data.filter(
          (e) => e.benchmarkedCostGfa !== null && e.benchmarkedCostGfa <= max
        );
      }
    }

    // Show Only filter
    if (filters.showOnly === "withValues") {
      data = data.filter(
        (e) => e.rcdcCostGfa !== null || e.benchmarkedCostGfa !== null
      );
    } else if (filters.showOnly === "empty") {
      data = data.filter(
        (e) => e.rcdcCostGfa === null && e.benchmarkedCostGfa === null
      );
    }

    return data;
  }, [
    filters,
    selectedAssetClass,
    selectedAssetTypeL1,
    selectedAssetFormL2,
    selectedPricePoint,
  ]);

  const clearFilters = () => {
    setFilters({
      search: "",
      assetClass: "",
      assetTypeL1: "",
      nrmLvl1: "",
      rcdcMin: "",
      rcdcMax: "",
      benchmarkMin: "",
      benchmarkMax: "",
      showOnly: "all",
    });
  };

  const handleValueChange = (
    id: string,
    field: "rcdc" | "benchmarked" | "bua" | "gia" | "gfa",
    value: string
  ) => {
    const numValue = value === "" ? null : parseFloat(value.replace(/,/g, ""));
    setEditedValues((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: numValue,
      },
    }));
  };

  const getValue = (entry: CostModelEntry, field: "rcdc" | "benchmarked" | "bua" | "gia" | "gfa") => {
    if (editedValues[entry.id]?.[field] !== undefined) {
      return editedValues[entry.id][field];
    }
    if (field === "rcdc") return entry.rcdcCostGfa;
    if (field === "benchmarked") return entry.benchmarkedCostGfa;
    if (field === "bua") return entry.costBua;
    if (field === "gia") return entry.costGia;
    return entry.costGfa;
  };

  const exportCSV = () => {
    const headers = [
      "Asset Class",
      "Asset Type (L1)",
      "Asset Form (L2)",
      "Price Point",
      "NRM Lvl 1",
      "RCDC Cost/GFA",
      "Benchmarked Cost/GFA",
      "BUA",
      "GIA",
      "GFA",
    ];
    const rows = filteredData.map((e) => [
      e.assetClass,
      e.assetTypeL1,
      e.assetFormL2,
      e.pricePoint,
      e.nrmLvl1,
      getValue(e, "rcdc") ?? "",
      getValue(e, "benchmarked") ?? "",
      getValue(e, "bua") ?? "",
      getValue(e, "gia") ?? "",
      getValue(e, "gfa") ?? "",
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cost-model-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Cost Modelling</h2>
          <p className="text-xs text-gray-500">
            View and manage all asset cost information ({costModelEntries.length.toLocaleString()} entries)
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Import/Export Buttons */}
          <CostModelImportExport onImportComplete={onRefresh} />
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
            <span className="font-medium">SAR</span>
            <button className="hover:text-gray-800">
              <X className="w-3 h-3" />
            </button>
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 border-b border-gray-200 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search all columns..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
            />
          </div>

          {/* Asset Class Dropdown */}
          <Select
            value={filters.assetClass || "all"}
            onValueChange={(value) =>
              setFilters({ ...filters, assetClass: value === "all" ? "" : value })
            }
          >
            <SelectTrigger className="min-w-[150px]">
              <SelectValue placeholder="All Asset Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Asset Class</SelectItem>
              {assetClassOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Asset Type L1 Dropdown */}
          <Select
            value={filters.assetTypeL1 || "all"}
            onValueChange={(value) =>
              setFilters({ ...filters, assetTypeL1: value === "all" ? "" : value })
            }
          >
            <SelectTrigger className="min-w-[150px]">
              <SelectValue placeholder="All Asset Type (L1)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Asset Type (L1)</SelectItem>
              {assetTypeL1Options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* NRM Lvl 1 Dropdown */}
          <Select
            value={filters.nrmLvl1 || "all"}
            onValueChange={(value) =>
              setFilters({ ...filters, nrmLvl1: value === "all" ? "" : value })
            }
          >
            <SelectTrigger className="min-w-[140px]">
              <SelectValue placeholder="All NRM Lvl 1" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All NRM Lvl 1</SelectItem>
              {nrmLvl1Options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear Button */}
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
            Clear
          </button>

          {/* CSV Export */}
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
        </div>

        {/* Advanced Filters Section */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-end gap-6 flex-wrap">
              {/* RCDC Cost Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  RCDC Cost Range
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Min"
                    value={filters.rcdcMin}
                    onChange={(e) =>
                      setFilters({ ...filters, rcdcMin: e.target.value })
                    }
                    className="w-28 px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="text"
                    placeholder="Max"
                    value={filters.rcdcMax}
                    onChange={(e) =>
                      setFilters({ ...filters, rcdcMax: e.target.value })
                    }
                    className="w-28 px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
                  />
                </div>
              </div>

              {/* Benchmark Cost Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Benchmark Cost Range
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Min"
                    value={filters.benchmarkMin}
                    onChange={(e) =>
                      setFilters({ ...filters, benchmarkMin: e.target.value })
                    }
                    className="w-28 px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="text"
                    placeholder="Max"
                    value={filters.benchmarkMax}
                    onChange={(e) =>
                      setFilters({ ...filters, benchmarkMax: e.target.value })
                    }
                    className="w-28 px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
                  />
                </div>
              </div>

              {/* Show Only */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Show Only
                </label>
                <Select
                  value={filters.showOnly}
                  onValueChange={(value) =>
                    setFilters({
                      ...filters,
                      showOnly: value as "all" | "withValues" | "empty",
                    })
                  }
                >
                  <SelectTrigger className="min-w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Rows</SelectItem>
                    <SelectItem value="withValues">Rows with Values</SelectItem>
                    <SelectItem value="empty">Empty Rows</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Showing count */}
              <div className="text-sm text-gray-500 pb-2">
                Showing {filteredData.length} rows
              </div>
            </div>
          </div>
        )}

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="inline-flex items-center gap-1 text-sm text-zinc-900 hover:text-zinc-800"
        >
          {showAdvancedFilters ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Hide Advanced Filters
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Advanced Filters
            </>
          )}
        </button>
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
                #
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-zinc-900 active:bg-zinc-900"
                  onMouseDown={(e) => handleMouseDown(0, e)}
                />
              </th>
              <th
                className="px-3 py-2.5 text-left text-sm font-medium text-gray-600 border-r border-gray-200 relative"
                style={{ width: `${columnWidths[1]}%` }}
              >
                Asset Class
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-zinc-900 active:bg-zinc-900"
                  onMouseDown={(e) => handleMouseDown(1, e)}
                />
              </th>
              <th
                className="px-3 py-2.5 text-left text-sm font-medium text-gray-600 border-r border-gray-200 relative"
                style={{ width: `${columnWidths[2]}%` }}
              >
                Asset Type (L1)
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-zinc-900 active:bg-zinc-900"
                  onMouseDown={(e) => handleMouseDown(2, e)}
                />
              </th>
              <th
                className="px-3 py-2.5 text-left text-sm font-medium text-gray-600 border-r border-gray-200 relative"
                style={{ width: `${columnWidths[3]}%` }}
              >
                Asset Form (L2)
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-zinc-900 active:bg-zinc-900"
                  onMouseDown={(e) => handleMouseDown(3, e)}
                />
              </th>
              <th
                className="px-3 py-2.5 text-left text-sm font-medium text-gray-600 border-r border-gray-200 relative"
                style={{ width: `${columnWidths[4]}%` }}
              >
                Price Point
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-zinc-900 active:bg-zinc-900"
                  onMouseDown={(e) => handleMouseDown(4, e)}
                />
              </th>
              <th
                className="px-3 py-2.5 text-left text-sm font-medium text-gray-600 border-r border-gray-200 relative"
                style={{ width: `${columnWidths[5]}%` }}
              >
                NRM Lvl 1
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-zinc-900 active:bg-zinc-900"
                  onMouseDown={(e) => handleMouseDown(5, e)}
                />
              </th>
              <th
                className="px-3 py-2.5 text-center text-sm font-medium text-gray-600 border-r border-gray-200 relative"
                style={{ width: `${columnWidths[6]}%` }}
              >
                RCDC Cost/GFA
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-zinc-900 active:bg-zinc-900"
                  onMouseDown={(e) => handleMouseDown(6, e)}
                />
              </th>
              <th
                className="px-3 py-2.5 text-center text-sm font-medium text-gray-600 border-r border-gray-200 relative"
                style={{ width: `${columnWidths[7]}%` }}
              >
                Benchmarked Cost/GFA
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-zinc-900 active:bg-zinc-900"
                  onMouseDown={(e) => handleMouseDown(7, e)}
                />
              </th>
              <th
                className="px-3 py-2.5 text-center text-sm font-medium text-gray-600 border-r border-gray-200 relative"
                style={{ width: `${columnWidths[8]}%` }}
              >
                BUA
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-zinc-900 active:bg-zinc-900"
                  onMouseDown={(e) => handleMouseDown(8, e)}
                />
              </th>
              <th
                className="px-3 py-2.5 text-center text-sm font-medium text-gray-600 border-r border-gray-200 relative"
                style={{ width: `${columnWidths[9]}%` }}
              >
                GIA
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-zinc-900 active:bg-zinc-900"
                  onMouseDown={(e) => handleMouseDown(9, e)}
                />
              </th>
              <th
                className="px-3 py-2.5 text-center text-sm font-medium text-gray-600 relative"
                style={{ width: `${columnWidths[10]}%` }}
              >
                GFA
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-zinc-900 active:bg-zinc-900"
                  onMouseDown={(e) => handleMouseDown(10, e)}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((entry, index) => (
              <tr
                key={entry.id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td
                  className="px-3 py-2 text-sm text-gray-500 border-r border-gray-100"
                  style={{ width: `${columnWidths[0]}%` }}
                >
                  {index + 1}
                </td>
                <td
                  className="px-3 py-2 text-sm text-gray-700 border-r border-gray-100 truncate"
                  style={{ width: `${columnWidths[1]}%` }}
                >
                  {entry.assetClass}
                </td>
                <td
                  className="px-3 py-2 text-sm text-gray-700 border-r border-gray-100 truncate"
                  style={{ width: `${columnWidths[2]}%` }}
                >
                  {entry.assetTypeL1}
                </td>
                <td
                  className="px-3 py-2 text-sm text-gray-700 border-r border-gray-100 truncate"
                  style={{ width: `${columnWidths[3]}%` }}
                >
                  {entry.assetFormL2}
                </td>
                <td
                  className="px-3 py-2 text-sm text-gray-700 border-r border-gray-100 truncate"
                  style={{ width: `${columnWidths[4]}%` }}
                >
                  {entry.pricePoint}
                </td>
                <td
                  className="px-3 py-2 text-sm text-gray-700 border-r border-gray-100 truncate"
                  style={{ width: `${columnWidths[5]}%` }}
                >
                  {entry.nrmLvl1}
                </td>
                <td
                  className="px-3 py-2 text-center border-r border-gray-100"
                  style={{ width: `${columnWidths[6]}%` }}
                >
                  <input
                    type="text"
                    value={
                      getValue(entry, "rcdc") !== null
                        ? formatNumber(getValue(entry, "rcdc") as number)
                        : ""
                    }
                    onChange={(e) =>
                      handleValueChange(entry.id, "rcdc", e.target.value)
                    }
                    className="w-full px-3 py-2 text-sm text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
                  />
                </td>
                <td
                  className="px-3 py-2 text-center border-r border-gray-100"
                  style={{ width: `${columnWidths[7]}%` }}
                >
                  <input
                    type="text"
                    value={
                      getValue(entry, "benchmarked") !== null
                        ? formatNumber(getValue(entry, "benchmarked") as number)
                        : ""
                    }
                    onChange={(e) =>
                      handleValueChange(entry.id, "benchmarked", e.target.value)
                    }
                    className="w-full px-3 py-2 text-sm text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
                  />
                </td>
                <td
                  className="px-3 py-2 text-center border-r border-gray-100"
                  style={{ width: `${columnWidths[8]}%` }}
                >
                  <input
                    type="text"
                    value={getValue(entry, "bua") !== null ? formatNumber(getValue(entry, "bua") as number) : ""}
                    onChange={(e) => handleValueChange(entry.id, "bua", e.target.value)}
                    className="w-full px-3 py-2 text-sm text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
                  />
                </td>
                <td
                  className="px-3 py-2 text-center border-r border-gray-100"
                  style={{ width: `${columnWidths[9]}%` }}
                >
                  <input
                    type="text"
                    value={getValue(entry, "gia") !== null ? formatNumber(getValue(entry, "gia") as number) : ""}
                    onChange={(e) => handleValueChange(entry.id, "gia", e.target.value)}
                    className="w-full px-3 py-2 text-sm text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
                  />
                </td>
                <td
                  className="px-3 py-2 text-center"
                  style={{ width: `${columnWidths[10]}%` }}
                >
                  <input
                    type="text"
                    value={getValue(entry, "gfa") !== null ? formatNumber(getValue(entry, "gfa") as number) : ""}
                    onChange={(e) => handleValueChange(entry.id, "gfa", e.target.value)}
                    className="w-full px-3 py-2 text-sm text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredData.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">No data matches your filters</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-200 text-xs text-gray-500">
        Showing {filteredData.length} of {costModelEntries.length} entries
      </div>
    </div>
  );
}
