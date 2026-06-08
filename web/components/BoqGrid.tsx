"use client";

import { useMemo, useEffect, useState } from "react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";

// Register modules once
ModuleRegistry.registerModules([AllCommunityModule]);

// IOX theme — pure monochrome, minimal contrast, matches the rest of the app
const ioxTheme = themeQuartz.withParams({
  fontFamily: "var(--font-inter), -apple-system, sans-serif",
  fontSize: 11.5,
  headerFontWeight: 600,
  rowHeight: 26,
  headerHeight: 28,
  backgroundColor: "#ffffff",
  foregroundColor: "#18181b",
  headerBackgroundColor: "#fafafa",
  headerTextColor: "#3f3f46",
  borderColor: "#e4e4e7",
  rowHoverColor: "#fafafa",
  oddRowBackgroundColor: "#ffffff",
  cellHorizontalPadding: 8,
});

interface Row {
  [key: string]: string | number | null;
}

const STAGE_COLOR: Record<string, string> = {
  Rule:  "bg-emerald-100 text-emerald-800 border-emerald-200",
  Fuzzy: "bg-amber-100 text-amber-800 border-amber-200",
  AI:    "bg-blue-100 text-blue-800 border-blue-200",
};

const SECTION_COLOR: Record<string, string> = {
  A: "bg-zinc-100 text-zinc-700",
  B: "bg-stone-100 text-stone-700",
  C: "bg-slate-100 text-slate-700",
  D: "bg-orange-100 text-orange-700",
  E: "bg-amber-100 text-amber-700",
  F: "bg-yellow-100 text-yellow-700",
  G: "bg-lime-100 text-lime-700",
  H: "bg-emerald-100 text-emerald-700",
  J: "bg-teal-100 text-teal-700",
  K: "bg-cyan-100 text-cyan-700",
  L: "bg-sky-100 text-sky-700",
  M: "bg-blue-100 text-blue-700",
  N: "bg-indigo-100 text-indigo-700",
  P: "bg-violet-100 text-violet-700",
  Q: "bg-fuchsia-100 text-fuchsia-700",
  R: "bg-rose-100 text-rose-700",
};

function StageRenderer(p: ICellRendererParams) {
  const v = String(p.value ?? "");
  if (!v) return null;
  const cls = STAGE_COLOR[v] ?? "bg-zinc-100 text-zinc-700 border-zinc-200";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${cls}`}
    >
      {v}
    </span>
  );
}

function FlagRenderer(p: ICellRendererParams) {
  const v = String(p.value ?? "");
  if (!v) return null;
  if (v === "⚠") {
    return <span className="text-amber-600 text-base">⚠</span>;
  }
  if (v === "✓") {
    return <span className="text-emerald-600 text-base">✓</span>;
  }
  return <span>{v}</span>;
}

function SectionRenderer(p: ICellRendererParams) {
  const v = String(p.value ?? "");
  if (!v) return null;
  // The Section column may contain "A — General Requirements" or just "A"
  const letter = v.charAt(0).toUpperCase();
  const cls = SECTION_COLOR[letter] ?? "bg-zinc-100 text-zinc-700";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${cls}`}>
      {v}
    </span>
  );
}

function ConfRenderer(p: ICellRendererParams) {
  const v = Number(p.value ?? 0);
  if (!v) return null;
  let color = "bg-emerald-500";
  if (v < 70) color = "bg-amber-500";
  if (v < 50) color = "bg-rose-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-12 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${v}%` }} />
      </div>
      <span className="text-[11px] text-zinc-600 tabular-nums">{v}</span>
    </div>
  );
}

const PINNED_LEFT = new Set(["Row", "REF", "ACTION", "Item", "Item Ref"]);
const NARROW = new Set([
  "Row", "REF", "Item", "Item Ref", "Qty", "Unit", "Currency", "Conf%",
  "Stage", "Flag", "NRM", "Code 1", "Code 2", "Code 3", "Code 4",
  "NRM L1", "NRM L2",
]);
const WIDE = new Set([
  "Description",
  "POMI Sub Section",
  "NRM Description",
  "NRM L1 Name",
  "NRM L2 Name",
  "POMI Section",
  "Measurement",
]);
const HIDDEN = new Set([
  "ACTION", "BATCH",
  "Country", "City", "Asset", "Project", "Type", "Employer", "Contractor",
  "Status", "Tender Date", "Award Date", "Contract Type",
]);

function colWidth(h: string): number | undefined {
  if (NARROW.has(h)) return 80;
  if (h === "Description") return 360;
  if (WIDE.has(h)) return 220;
  if (h === "Rate" || h === "Amount") return 110;
  return 130;
}

export function BoqGrid({
  rows,
  headers,
}: {
  rows: Row[];
  headers: string[];
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const colDefs = useMemo<ColDef[]>(() => {
    return headers
      .filter((h) => !HIDDEN.has(h))
      .map<ColDef>((h) => {
        const def: ColDef = {
          field: h,
          headerName: h,
          width: colWidth(h),
          pinned: PINNED_LEFT.has(h) ? "left" : undefined,
          resizable: true,
          sortable: true,
          filter: true,
        };
        if (h === "Description" || h === "POMI Sub Section" || h === "NRM Description") {
          def.wrapText = true;
          def.autoHeight = true;
          def.cellStyle = { lineHeight: "1.4", paddingTop: 6, paddingBottom: 6 };
        }
        if (h === "Stage") def.cellRenderer = StageRenderer;
        if (h === "Flag") def.cellRenderer = FlagRenderer;
        if (h === "POMI Section") def.cellRenderer = SectionRenderer;
        if (h === "Conf%") def.cellRenderer = ConfRenderer;
        if (h === "Rate" || h === "Amount") {
          def.type = "numericColumn";
          def.valueFormatter = (p) =>
            typeof p.value === "number" ? p.value.toLocaleString() : (p.value ?? "");
        }
        return def;
      });
  }, [headers]);

  if (!mounted) {
    return (
      <div className="h-full bg-white border border-zinc-200 rounded-xl flex items-center justify-center text-zinc-400">
        Loading grid…
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <AgGridReact
        theme={ioxTheme}
        rowData={rows}
        columnDefs={colDefs}
        defaultColDef={{
          resizable: true,
          sortable: true,
          filter: true,
          floatingFilter: false,
        }}
        getRowClass={(p) =>
          p.data?.["Flag"] === "⚠" ? "bg-amber-50/40" : ""
        }
        suppressMovableColumns={false}
        rowBuffer={20}
        animateRows={false}
      />
    </div>
  );
}
