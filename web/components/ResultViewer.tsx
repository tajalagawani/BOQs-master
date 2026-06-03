"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Download, AlertTriangle } from "lucide-react";
import { SheetTabs } from "./SheetTabs";
import { BoqGrid } from "./BoqGrid";

interface Props {
  runId: string;
}

interface SheetData {
  name: string;
  headers: string[];
  rows: Array<Record<string, string | number | null>>;
  rowCount: number;
}

// Sheets to prefer at the top of the tab strip
const PRIORITY = ["MASTER BOQs", "BILL SUMMARY", "ICMS SUMMARY", "SUMMARY"];

function sortSheets(sheets: string[]): string[] {
  const head: string[] = [];
  for (const p of PRIORITY) if (sheets.includes(p)) head.push(p);
  const rest = sheets.filter((s) => !PRIORITY.includes(s));
  return [...head, ...rest];
}

export function ResultViewer({ runId }: Props) {
  const [sheets, setSheets] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [data, setData] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(`/api/sheets/${runId}`);
        if (!r.ok) throw new Error("could not list sheets");
        const j = (await r.json()) as { sheets: string[] };
        const sorted = sortSheets(j.sheets);
        setSheets(sorted);
        setCurrent(sorted[0] ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "load failed");
      }
    };
    load();
  }, [runId]);

  const loadSheet = useCallback(
    async (name: string) => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(
          `/api/sheet/${runId}/${encodeURIComponent(name)}`,
        );
        if (!r.ok) throw new Error(`failed to read "${name}"`);
        const j = (await r.json()) as SheetData;
        setData(j);
      } catch (e) {
        setError(e instanceof Error ? e.message : "load failed");
      } finally {
        setLoading(false);
      }
    },
    [runId],
  );

  useEffect(() => {
    if (current) loadSheet(current);
  }, [current, loadSheet]);

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          {sheets.length > 0 && current ? (
            <SheetTabs sheets={sheets} current={current} onChange={setCurrent} />
          ) : (
            <div className="h-9 bg-white border border-zinc-200 rounded-lg px-3 inline-flex items-center text-xs text-zinc-500">
              Loading sheets…
            </div>
          )}
        </div>
        {data && (
          <div className="hidden sm:flex items-center gap-3 px-2.5 h-8 text-[11px] text-zinc-500 bg-white border border-zinc-200 rounded-lg shrink-0">
            <span>
              <span className="font-medium text-zinc-900">{data.rowCount}</span> rows
            </span>
            <span className="text-zinc-300">·</span>
            <span>
              <span className="font-medium text-zinc-900">{data.headers.length}</span> cols
            </span>
          </div>
        )}
        <a
          href={`/api/run/${runId}/export`}
          className="h-8 px-3 bg-white border border-zinc-200 hover:border-zinc-400 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 text-zinc-900 shrink-0"
        >
          <Download className="size-3.5" strokeWidth={1.75} />
          xlsx
        </a>
      </div>

      <div className="flex-1 min-h-0 relative">
        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-5 py-4 flex items-center gap-2 text-rose-800 text-sm">
              <AlertTriangle className="size-4" />
              {error}
            </div>
          </div>
        )}
        {loading && !data && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-6 text-zinc-400 animate-spin" />
          </div>
        )}
        {data && (
          <BoqGrid rows={data.rows} headers={data.headers} />
        )}
      </div>
    </div>
  );
}
