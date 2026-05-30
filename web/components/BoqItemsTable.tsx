"use client";

import { Search, ChevronRight, Settings2, MoreVertical, ChevronLeft, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/cn";
import { fmtINR } from "@/lib/demoBoq";

export interface BoqTableItem {
  code: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  version?: string;       // optional — derived from POMI Stage for real data
  stage?: string;         // "Rule" / "Fuzzy" / "AI"
}

interface Props {
  sectionCode: string;
  sectionName: string;
  sectionItemCount: number;
  items: BoqTableItem[];
  selectedItemCode: string | null;
  onSelectItem: (code: string) => void;
}

export function BoqItemsTable({
  sectionCode,
  sectionName,
  sectionItemCount,
  items,
  selectedItemCode,
  onSelectItem,
}: Props) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Reset to page 1 when the section changes
  useEffect(() => {
    setPage(1);
    setQ("");
  }, [sectionCode]);

  const filtered = useMemo(
    () =>
      items.filter(
        (it) =>
          it.code.toLowerCase().includes(q.toLowerCase()) ||
          it.description.toLowerCase().includes(q.toLowerCase()),
      ),
    [items, q],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <section className="flex-1 min-w-0 flex flex-col gap-2.5 h-full overflow-hidden">
      <div className="bg-white border border-zinc-200 rounded-xl px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-500 font-medium">{sectionCode}</span>
          <span className="text-zinc-900 font-medium">{sectionName}</span>
          <ChevronRight className="size-3.5 text-zinc-300" strokeWidth={1.75} />
          <span className="text-zinc-500">
            All Items ({sectionItemCount.toLocaleString()})
          </span>
        </div>
        <div className="relative w-[260px]">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400"
            strokeWidth={1.75}
          />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search items..."
            className="w-full h-8 pl-8 pr-2 bg-white border border-zinc-200 rounded-lg text-xs placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white border border-zinc-200 rounded-xl flex flex-col overflow-hidden">
        <div className="bg-zinc-50 border-b border-zinc-200 shrink-0">
          <table className="w-full text-xs table-fixed">
            <colgroup>
              <col className="w-10" />
              <col className="w-[110px]" />
              <col />
              <col className="w-[60px]" />
              <col className="w-[80px]" />
              <col className="w-[110px]" />
              <col className="w-[120px]" />
              <col className="w-[70px]" />
              <col className="w-10" />
            </colgroup>
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-500">
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    className="size-3.5 rounded border-zinc-300 accent-zinc-900"
                  />
                </th>
                <th className="px-2 py-2 font-medium">Item Code</th>
                <th className="px-2 py-2 font-medium">Description</th>
                <th className="px-2 py-2 font-medium">Unit</th>
                <th className="px-2 py-2 font-medium text-right">Quantity</th>
                <th className="px-2 py-2 font-medium text-right">Rate (₹)</th>
                <th className="px-2 py-2 font-medium text-right">Amount (₹)</th>
                <th className="px-2 py-2 font-medium">Version</th>
                <th className="px-2 py-2 text-zinc-400">
                  <Settings2 className="size-3.5" strokeWidth={1.75} />
                </th>
              </tr>
            </thead>
          </table>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <table className="w-full text-xs table-fixed">
            <colgroup>
              <col className="w-10" />
              <col className="w-[110px]" />
              <col />
              <col className="w-[60px]" />
              <col className="w-[80px]" />
              <col className="w-[110px]" />
              <col className="w-[120px]" />
              <col className="w-[70px]" />
              <col className="w-10" />
            </colgroup>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-xs text-zinc-500">
                    No items in this section yet.
                  </td>
                </tr>
              ) : (
                pageItems.map((it) => (
                  <BoqRow
                    key={it.code}
                    item={it}
                    selected={it.code === selectedItemCode}
                    onClick={() => onSelectItem(it.code)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-zinc-200 px-4 py-2 flex items-center justify-between text-[11px] text-zinc-600 shrink-0">
          <div>
            Showing {pageItems.length === 0 ? 0 : (page - 1) * pageSize + 1} to{" "}
            {(page - 1) * pageSize + pageItems.length} of {filtered.length} items
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <select
                value={pageSize}
                disabled
                className="h-7 px-2 bg-white border border-zinc-200 rounded text-xs"
              >
                <option>{pageSize}</option>
              </select>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                disabled={page === 1}
                onClick={() => setPage(1)}
                type="button"
                className="size-7 inline-flex items-center justify-center rounded hover:bg-zinc-100 disabled:text-zinc-300"
              >
                <ChevronsLeft className="size-3.5" />
              </button>
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                type="button"
                className="size-7 inline-flex items-center justify-center rounded hover:bg-zinc-100 disabled:text-zinc-300"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              {pageWindow(page, totalPages).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={cn(
                    "size-7 inline-flex items-center justify-center rounded text-xs",
                    p === page
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-700 hover:bg-zinc-100",
                  )}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                type="button"
                className="size-7 inline-flex items-center justify-center rounded hover:bg-zinc-100 disabled:text-zinc-300"
              >
                <ChevronRight className="size-3.5" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
                type="button"
                className="size-7 inline-flex items-center justify-center rounded hover:bg-zinc-100 disabled:text-zinc-300"
              >
                <ChevronsRight className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BoqRow({
  item,
  selected,
  onClick,
}: {
  item: BoqTableItem;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "cursor-pointer border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50",
        selected && "bg-zinc-50",
      )}
    >
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked={selected}
          readOnly
          onClick={(e) => e.stopPropagation()}
          className="size-3.5 rounded border-zinc-300 accent-zinc-900"
        />
      </td>
      <td className="px-2 py-2 text-zinc-700 font-mono text-[11.5px] truncate">
        {item.code}
      </td>
      <td className="px-2 py-2 text-zinc-900 truncate">{item.description}</td>
      <td className="px-2 py-2 text-zinc-700">{item.unit}</td>
      <td className="px-2 py-2 text-zinc-700 text-right tabular-nums">
        {item.quantity ? item.quantity.toLocaleString(undefined, { maximumFractionDigits: 3 }) : "—"}
      </td>
      <td className="px-2 py-2 text-zinc-700 text-right tabular-nums">
        {item.rate ? fmtINR(item.rate, false) : "—"}
      </td>
      <td className="px-2 py-2 text-zinc-900 font-medium text-right tabular-nums">
        {item.amount ? fmtINR(item.amount, false) : "—"}
      </td>
      <td className="px-2 py-2 text-zinc-700">{item.version ?? "v1.0"}</td>
      <td className="px-2 py-2 text-center">
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="size-6 inline-flex items-center justify-center rounded hover:bg-zinc-100"
        >
          <MoreVertical className="size-3.5 text-zinc-400" />
        </button>
      </td>
    </tr>
  );
}

function pageWindow(current: number, total: number): number[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 4, 5];
  if (current >= total - 2) return [total - 4, total - 3, total - 2, total - 1, total];
  return [current - 2, current - 1, current, current + 1, current + 2];
}
