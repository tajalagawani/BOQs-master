"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Search, ChevronUp, ChevronDown } from "lucide-react";
import { ParametricMatrixEntry, ParametricTreeNode } from "@/types/costModel";

interface ParametricMatrixPanelProps {
  parametricMatrixEntries: ParametricMatrixEntry[];
  selectedNode?: ParametricTreeNode | null;
}

type SortField = "nrmLvl1" | "parameter" | "option" | "factor";
type SortDirection = "asc" | "desc";

export default function ParametricMatrixPanel({ parametricMatrixEntries, selectedNode }: ParametricMatrixPanelProps) {
  const [search, setSearch] = useState("");
  const [editedFactors, setEditedFactors] = useState<Record<string, number>>({});
  const [sortField, setSortField] = useState<SortField>("nrmLvl1");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Column resize state
  const [columnWidths, setColumnWidths] = useState<number[]>([30, 25, 20, 25]);
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
      const newWidth = Math.max(10, Math.min(50, startWidthRef.current + diffPercent));

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

  // Filter and sort data
  const filteredData = useMemo(() => {
    let data = [...parametricMatrixEntries];

    // Apply tree selection filter
    if (selectedNode) {
      if (selectedNode.type === "parameter") {
        data = data.filter((e) => e.parameter === selectedNode.label);
      } else if (selectedNode.type === "option") {
        data = data.filter((e) => e.option === selectedNode.label);
      }
    }

    // Apply search
    if (search) {
      const searchLower = search.toLowerCase();
      data = data.filter(
        (e) =>
          e.nrmLvl1.toLowerCase().includes(searchLower) ||
          e.parameter.toLowerCase().includes(searchLower) ||
          e.option.toLowerCase().includes(searchLower)
      );
    }

    // Apply sort
    data.sort((a, b) => {
      let aVal: string | number = a[sortField];
      let bVal: string | number = b[sortField];

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return data;
  }, [search, selectedNode, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleFactorChange = (id: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setEditedFactors((prev) => ({ ...prev, [id]: numValue }));
    }
  };

  const getFactor = (entry: ParametricMatrixEntry) => {
    return editedFactors[entry.id] ?? entry.factor;
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="w-4 h-4 inline ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline ml-1" />
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-800">Parametric Adjustment Matrix</h2>
        <p className="text-xs text-gray-500 mt-1">
          Manage your NRM parameters here.
        </p>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
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
                className="px-3 py-2.5 text-left text-sm font-medium text-gray-600 border-r border-gray-200 relative cursor-pointer hover:bg-gray-100"
                style={{ width: `${columnWidths[0]}%` }}
                onClick={() => handleSort("nrmLvl1")}
              >
                NRM Lvl 1 <SortIcon field="nrmLvl1" />
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-zinc-900 active:bg-zinc-900"
                  onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(0, e); }}
                />
              </th>
              <th
                className="px-3 py-2.5 text-left text-sm font-medium text-gray-600 border-r border-gray-200 relative cursor-pointer hover:bg-gray-100"
                style={{ width: `${columnWidths[1]}%` }}
                onClick={() => handleSort("parameter")}
              >
                Parameter <SortIcon field="parameter" />
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-zinc-900 active:bg-zinc-900"
                  onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(1, e); }}
                />
              </th>
              <th
                className="px-3 py-2.5 text-left text-sm font-medium text-gray-600 border-r border-gray-200 relative cursor-pointer hover:bg-gray-100"
                style={{ width: `${columnWidths[2]}%` }}
                onClick={() => handleSort("option")}
              >
                Option <SortIcon field="option" />
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-zinc-900 active:bg-zinc-900"
                  onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(2, e); }}
                />
              </th>
              <th
                className="px-3 py-2.5 text-center text-sm font-medium text-gray-600 relative cursor-pointer hover:bg-gray-100"
                style={{ width: `${columnWidths[3]}%` }}
                onClick={() => handleSort("factor")}
              >
                Factor <SortIcon field="factor" />
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-zinc-900 active:bg-zinc-900"
                  onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(3, e); }}
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
                  className="px-3 py-2 text-sm text-gray-700 border-r border-gray-100 truncate"
                  style={{ width: `${columnWidths[0]}%` }}
                >
                  {entry.nrmLvl1}
                </td>
                <td
                  className="px-3 py-2 text-sm text-gray-700 border-r border-gray-100 truncate"
                  style={{ width: `${columnWidths[1]}%` }}
                >
                  {entry.parameter}
                </td>
                <td
                  className="px-3 py-2 text-sm text-gray-700 border-r border-gray-100 truncate"
                  style={{ width: `${columnWidths[2]}%` }}
                >
                  {entry.option}
                </td>
                <td
                  className="px-3 py-2 text-center"
                  style={{ width: `${columnWidths[3]}%` }}
                >
                  <input
                    type="number"
                    step="0.1"
                    value={getFactor(entry)}
                    onChange={(e) => handleFactorChange(entry.id, e.target.value)}
                    className="w-20 px-3 py-2 text-sm text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
                  />
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
        Showing {filteredData.length} of {parametricMatrixEntries.length} entries
      </div>
    </div>
  );
}
