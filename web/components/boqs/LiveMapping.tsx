"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Check, AlertTriangle, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";

const SECTION_TITLES: Record<string, string> = {
  A: "General Requirements", B: "Site Work", C: "Concrete", D: "Masonry",
  E: "Metalwork", F: "Woodwork", G: "Thermal & Moisture", H: "Doors & Windows",
  J: "Finishes", K: "Accessories", L: "Equipment", M: "Furnishings",
  N: "Special Construction", P: "Conveying", Q: "Mechanical", R: "Electrical",
};

type Status = "mapping" | "complete" | "failed";

interface Pomi {
  code?: string;
  section?: string;
  sub_section?: string;
  confidence?: number | null;
  needs_review?: boolean;
  pomi_desc?: string;
  nrm_code?: string;
  nrm_desc?: string;
  method?: string;
}
interface Item {
  sheet: string;
  ref?: string;
  full_description?: string;
  description?: string;
  unit?: string;
  quantity?: number | null;
  rate?: number | null;
  amount?: number | null;
  pomi?: Pomi;
}
interface ParsedResult {
  items: Item[];
  summary?: { items?: number };
}

const fmt = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : n.toLocaleString(undefined, { maximumFractionDigits: 2 });

export function LiveMapping({ runId, model }: { runId: string; model?: string }) {
  const started = useRef(false);
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<Status>("mapping");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState("");
  const [reviewOnly, setReviewOnly] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/run/${runId}/map-stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model }),
        });
        if (!res.ok || !res.body) throw new Error(`mapping failed to start (${res.status})`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let live: Item[] = [];
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const parts = buf.split("\n\n");
          buf = parts.pop() || "";
          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data:")) continue;
            const msg = JSON.parse(line.slice(5).trim());
            if (cancelled) continue;
            if (msg.type === "parsed") {
              live = (msg.result as ParsedResult).items || [];
              setItems([...live]);
              setProgress({ done: 0, total: live.length });
            } else if (msg.type === "mapped") {
              for (const e of msg.entries) {
                const it = live[e.index];
                if (it)
                  it.pomi = {
                    ...it.pomi,
                    code: e.code,
                    section: e.section,
                    sub_section: e.sub_section,
                    confidence: e.confidence,
                    needs_review: e.needs_review,
                    pomi_desc: e.pomi_desc,
                    nrm_code: e.nrm_code,
                    nrm_desc: e.nrm_desc,
                    method: e.method,
                  };
              }
              setItems([...live]);
            } else if (msg.type === "progress") {
              setProgress({ done: msg.done, total: msg.total });
            } else if (msg.type === "done") {
              setStatus("complete");
            } else if (msg.type === "error") {
              throw new Error(msg.message);
            }
          }
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "mapping failed");
        setStatus("failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [runId, model]);

  const sectionCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const it of items) {
      const s = it.pomi?.section;
      if (s) m[s] = (m[s] || 0) + 1;
    }
    return Object.fromEntries(Object.entries(m).sort());
  }, [items]);

  const shown = useMemo(() => {
    return items.filter((it) => {
      if (section && it.pomi?.section !== section) return false;
      if (reviewOnly && !it.pomi?.needs_review) return false;
      return true;
    });
  }, [items, section, reviewOnly]);

  const mapped = items.filter((it) => it.pomi?.code).length;
  const pct = progress ? Math.round((progress.done / Math.max(1, progress.total)) * 100) : 0;

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      {/* Status bar */}
      <div className="flex items-center justify-between bg-white border border-zinc-200 rounded-xl px-5 py-3 shrink-0">
        <div className="flex items-center gap-3">
          {status === "mapping" && (
            <>
              <Loader2 className="size-5 text-emerald-600 animate-spin" />
              <span className="font-medium text-zinc-900">Mapping…</span>
              {progress && (
                <span className="text-sm text-zinc-500 tabular-nums">
                  {progress.done}/{progress.total} items ({pct}%)
                </span>
              )}
            </>
          )}
          {status === "complete" && (
            <>
              <div className="size-7 rounded-full bg-emerald-100 text-emerald-700 inline-flex items-center justify-center">
                <Check className="size-4" strokeWidth={2.5} />
              </div>
              <span className="font-medium text-zinc-900">Complete</span>
              <span className="text-sm text-zinc-500">{mapped}/{items.length} mapped</span>
            </>
          )}
          {status === "failed" && (
            <>
              <div className="size-7 rounded-full bg-rose-100 text-rose-700 inline-flex items-center justify-center">
                <AlertTriangle className="size-4" strokeWidth={2.5} />
              </div>
              <span className="font-medium text-zinc-900">Failed</span>
              {error && <span className="text-sm text-rose-600">{error}</span>}
            </>
          )}
        </div>
        <Link
          href={`/boqs/${runId}`}
          className={cn(
            "h-9 px-4 rounded-lg text-sm font-medium inline-flex items-center gap-2",
            status === "complete"
              ? "bg-zinc-900 text-white hover:bg-zinc-800"
              : "bg-zinc-100 text-zinc-400 pointer-events-none",
          )}
        >
          Open full workspace
          <ArrowUpRight className="size-4" strokeWidth={2} />
        </Link>
      </div>

      {/* Progress bar */}
      {status === "mapping" && (
        <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden shrink-0">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}

      {/* Section filter chips */}
      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        <Chip active={section === ""} onClick={() => setSection("")}>
          All ({items.length})
        </Chip>
        {Object.entries(sectionCounts).map(([s, n]) => (
          <Chip key={s} active={section === s} onClick={() => setSection(s)}>
            {s} {SECTION_TITLES[s]?.split(" ")[0]} ({n})
          </Chip>
        ))}
        <label className="text-xs text-zinc-500 flex items-center gap-1 ml-1">
          <input
            type="checkbox"
            checked={reviewOnly}
            onChange={(e) => setReviewOnly(e.target.checked)}
            className="accent-zinc-900"
          />
          review only
        </label>
        <span className="ml-auto text-xs text-zinc-400">{shown.length.toLocaleString()} shown</span>
      </div>

      {/* Live table */}
      <div className="flex-1 min-h-0 bg-white border border-zinc-200 rounded-xl overflow-auto">
        <table className="text-xs whitespace-nowrap">
          <thead className="bg-zinc-50 text-zinc-500 text-left sticky top-0 z-10">
            <tr className="border-b border-zinc-200">
              <Th>Row</Th>
              <Th>REF</Th>
              <Th>Description</Th>
              <Th className="text-right">Qty</Th>
              <Th>Unit</Th>
              <Th className="text-right">Rate</Th>
              <Th className="text-right">Amount</Th>
              <Th>POMI Section</Th>
              <Th>Code 1</Th>
              <Th>Code 2</Th>
              <Th>Code 3</Th>
              <Th>Code 4</Th>
              <Th>POMI Sub Section</Th>
              <Th>NRM</Th>
              <Th>NRM Description</Th>
              <Th>Measurement</Th>
              <Th className="text-right">Conf%</Th>
              <Th>Stage</Th>
              <Th>Flag</Th>
            </tr>
          </thead>
          <tbody>
            {shown.slice(0, 1500).map((it, i) => {
              const code = it.pomi?.code || "";
              const sec = it.pomi?.section || "";
              const secLabel = sec ? `${sec} — ${SECTION_TITLES[sec] || ""}`.trim() : "";
              const stage = code ? "AI" : "";
              const flag = it.pomi?.needs_review ? "⚠" : code ? "✓" : "";
              return (
                <tr
                  key={i}
                  className={cn(
                    "border-b border-zinc-100 align-top hover:bg-zinc-50",
                    it.pomi?.needs_review && "bg-amber-50/40",
                  )}
                >
                  <Td className="text-zinc-400 tabular-nums">{i + 1}</Td>
                  <Td className="text-zinc-500 font-mono text-[11px]">{it.ref || "—"}</Td>
                  <Td className="text-zinc-800 max-w-md whitespace-normal">
                    <span className="line-clamp-2">{it.full_description || it.description}</span>
                  </Td>
                  <Td className="text-right tabular-nums">{fmt(it.quantity)}</Td>
                  <Td>{it.unit}</Td>
                  <Td className="text-right tabular-nums">{fmt(it.rate)}</Td>
                  <Td className="text-right tabular-nums">{fmt(it.amount)}</Td>
                  <Td className="text-zinc-600">{secLabel || (code ? "" : <PendingDot />)}</Td>
                  <Td className="font-mono text-[11px] text-zinc-700">{code.slice(0, 1)}</Td>
                  <Td className="font-mono text-[11px] text-zinc-700">{code.slice(1, 3)}</Td>
                  <Td className="font-mono text-[11px] text-zinc-700">{code.slice(3, 5)}</Td>
                  <Td className="font-mono text-[11px] text-zinc-700">{code.slice(5, 7)}</Td>
                  <Td className="max-w-[200px] truncate text-zinc-600">{it.pomi?.sub_section}</Td>
                  <Td className="text-zinc-500">{it.pomi?.nrm_code}</Td>
                  <Td className="max-w-[220px] truncate text-zinc-500">{it.pomi?.nrm_desc}</Td>
                  <Td className="max-w-[200px] truncate text-zinc-500">{it.pomi?.method}</Td>
                  <Td className="text-right">
                    <ConfBadge c={it.pomi?.confidence} review={it.pomi?.needs_review} />
                  </Td>
                  <Td>
                    {stage ? (
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[10.5px] font-medium bg-blue-100 text-blue-800">
                        {stage}
                      </span>
                    ) : (
                      <PendingDot />
                    )}
                  </Td>
                  <Td className="text-center">
                    {flag === "⚠" ? (
                      <span className="text-amber-600">⚠</span>
                    ) : flag === "✓" ? (
                      <span className="text-emerald-600">✓</span>
                    ) : (
                      <span className="text-zinc-300">—</span>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {shown.length > 1500 && (
          <div className="p-2 text-xs text-zinc-400">
            Showing first 1500 of {shown.length.toLocaleString()}.
          </div>
        )}
        {items.length === 0 && (
          <div className="p-8 text-center text-sm text-zinc-400">Parsing workbook…</div>
        )}
      </div>
    </div>
  );
}

function PendingDot() {
  return (
    <span className="inline-flex items-center gap-1 text-zinc-300">
      <span className="size-1.5 rounded-full bg-zinc-300 animate-pulse" />
    </span>
  );
}
function ConfBadge({ c, review }: { c?: number | null; review?: boolean }) {
  if (c == null) return <span className="text-zinc-300">—</span>;
  const color = c >= 85 ? "bg-emerald-100 text-emerald-700" : c >= 70 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
  return (
    <span className={"px-1.5 py-0.5 rounded text-[11px] " + color} title={review ? "needs review" : ""}>
      {Math.round(c)}
    </span>
  );
}
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "text-xs px-2 py-0.5 rounded border " +
        (active ? "bg-zinc-900 text-white border-zinc-900" : "border-zinc-300 text-zinc-600 hover:border-zinc-400")
      }
    >
      {children}
    </button>
  );
}
const Th = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <th className={"px-2 py-1.5 font-medium " + className}>{children}</th>
);
const Td = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <td className={"px-2 py-1.5 " + className}>{children}</td>
);
