"use client";

import { Search, SlidersHorizontal, Plus, ChevronRight, FileText } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { fmtINR } from "@/lib/demoBoq";

export interface BoqSectionEntry {
  code: string;
  name: string;
  itemCount: number;
  totalAmount?: number;
}

interface Props {
  sections: BoqSectionEntry[];
  totals: {
    amount: number;
    items: number;
    sections: number;
    trades: number;
    currentVersion: string;
  };
  selectedSection: string;
  onSelect: (code: string) => void;
}

export function BoqSections({ sections, totals, selectedSection, onSelect }: Props) {
  const [tab, setTab] = useState<"sections" | "trades">("sections");
  const [q, setQ] = useState("");

  const filtered = sections.filter(
    (sec) =>
      sec.name.toLowerCase().includes(q.toLowerCase()) || sec.code.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <aside className="w-[240px] shrink-0 flex flex-col gap-3 h-full overflow-hidden">
      <div className="bg-white border border-zinc-200 rounded-xl p-1 flex shrink-0">
        <button
          type="button"
          onClick={() => setTab("sections")}
          className={cn(
            "flex-1 h-8 text-xs font-medium rounded-md transition-colors",
            tab === "sections" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100",
          )}
        >
          Sections
        </button>
        <button
          type="button"
          onClick={() => setTab("trades")}
          className={cn(
            "flex-1 h-8 text-xs font-medium rounded-md transition-colors",
            tab === "trades" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100",
          )}
        >
          Trades
        </button>
      </div>

      <div className="flex gap-2 shrink-0">
        <div className="flex-1 relative">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400"
            strokeWidth={1.75}
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search sections..."
            className="w-full h-8 pl-8 pr-2 bg-white border border-zinc-200 rounded-lg text-xs placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400"
          />
        </div>
        <button
          type="button"
          aria-label="Filter"
          className="size-8 bg-white border border-zinc-200 rounded-lg inline-flex items-center justify-center hover:border-zinc-400"
        >
          <SlidersHorizontal className="size-3.5 text-zinc-600" strokeWidth={1.75} />
        </button>
      </div>

      <ul className="flex-1 min-h-0 overflow-y-auto space-y-1">
        {filtered.map((sec) => {
          const active = sec.code === selectedSection;
          return (
            <li key={sec.code}>
              <button
                type="button"
                onClick={() => onSelect(sec.code)}
                className={cn(
                  "w-full flex items-center justify-between gap-3 px-3 h-10 rounded-lg transition-colors",
                  active
                    ? "bg-zinc-900 text-white"
                    : "bg-white border border-zinc-200 text-zinc-900 hover:border-zinc-400",
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={cn(
                      "text-[11px] font-medium shrink-0",
                      active ? "text-zinc-400" : "text-zinc-500",
                    )}
                  >
                    {sec.code}
                  </span>
                  <span className="text-xs font-medium truncate">{sec.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      "text-[11px] tabular-nums",
                      active ? "text-zinc-300" : "text-zinc-500",
                    )}
                  >
                    {sec.itemCount}
                  </span>
                  <ChevronRight
                    className={cn(
                      "size-3.5",
                      active ? "text-zinc-300" : "text-zinc-400",
                    )}
                    strokeWidth={1.75}
                  />
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className="shrink-0 w-full h-10 bg-white border border-dashed border-zinc-300 rounded-lg text-xs font-medium text-zinc-700 inline-flex items-center justify-center gap-1.5 hover:border-zinc-500"
      >
        <Plus className="size-3.5" strokeWidth={2} />
        Add Section
      </button>

      <div className="shrink-0 bg-white border border-zinc-200 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="size-7 rounded-md bg-zinc-100 inline-flex items-center justify-center">
            <FileText className="size-3.5 text-zinc-700" strokeWidth={1.75} />
          </div>
          <span className="text-[11px] text-zinc-500">
            Total BOQ Amount ({totals.currentVersion})
          </span>
        </div>
        <div className="text-base font-bold tracking-tight text-zinc-900 leading-tight">
          {fmtINR(totals.amount)}
        </div>
        <div className="text-[10.5px] text-zinc-500 mt-1.5">
          {totals.items} Items · {totals.sections} Sections · {totals.trades} Trades
        </div>
      </div>
    </aside>
  );
}
