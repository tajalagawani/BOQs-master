"use client";

// Right slide-over showing one project's full elemental breakdown — opened by
// clicking a bar (Composition) or a dot (Distribution). Gives the officer the
// per-element value, share of total, and project metadata in one place.

import { useMemo } from "react";
import { X } from "lucide-react";
import type { ElementalProject } from "@/modules/rates/lib/db/queries";
import {
  type Basis,
  projectElementValues,
  projectTotal,
  projectFactor,
  fmt,
} from "@/modules/rates/charts/elemental-data";
import { elementColor, sortElements } from "@/modules/rates/charts/elemental-palette";

interface Props {
  project: ElementalProject | null;
  basis: Basis;
  refYear: number;
  inflationOn: boolean;
  onClose: () => void;
}

export function ProjectDetailDrawer({ project, basis, refYear, inflationOn, onClose }: Props) {
  const open = project !== null;

  const { items, total, factor } = useMemo(() => {
    if (!project) return { items: [], total: 0, factor: 1 };
    const vals = projectElementValues(project, basis, refYear, inflationOn);
    const byLabel = new Map(vals.map((v) => [v.label, v.value]));
    const items = sortElements([...byLabel.keys()]).map((label) => ({
      label,
      value: byLabel.get(label) ?? 0,
    }));
    return {
      items,
      total: projectTotal(vals),
      factor: projectFactor(project, refYear, inflationOn),
    };
  }, [project, basis, refYear, inflationOn]);

  const cur = project?.currency ?? "";
  const area =
    basis === "BUA" ? project?.bua : basis === "GIA" ? project?.gia : project?.gfa;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={
          "fixed inset-0 z-40 bg-zinc-900/20 backdrop-blur-[1px] transition-opacity " +
          (open ? "opacity-100" : "opacity-0 pointer-events-none")
        }
      />
      {/* Panel */}
      <aside
        role="dialog"
        aria-label="Project elemental breakdown"
        className={
          "fixed right-0 top-0 z-50 h-full w-full max-w-[420px] bg-white shadow-2xl border-l border-zinc-200 flex flex-col transition-transform duration-200 " +
          (open ? "translate-x-0" : "translate-x-full")
        }
      >
        {project ? (
          <>
            <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-zinc-100">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-zinc-900 leading-tight">
                  {project.project}
                </h2>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {[project.assetClass, project.assetType, project.country]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 size-7 grid place-items-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="size-4" strokeWidth={1.75} />
              </button>
            </div>

            {/* Meta strip */}
            <div className="shrink-0 grid grid-cols-3 gap-px bg-zinc-100 border-b border-zinc-100 text-center">
              <Meta label="Base year" value={project.baseYear ? String(project.baseYear) : "—"} />
              <Meta label="Currency" value={cur || "—"} />
              <Meta
                label={`${basis} (m²)`}
                value={area != null ? fmt(area) : "—"}
              />
            </div>

            {/* Total */}
            <div className="shrink-0 px-5 py-3 flex items-baseline justify-between border-b border-zinc-100">
              <span className="text-[11px] uppercase tracking-wide text-zinc-500 font-medium">
                Total · {basis}
                {inflationOn && factor !== 1 ? (
                  <span className="ml-1 text-emerald-600 normal-case tracking-normal">
                    (adj. to {refYear})
                  </span>
                ) : null}
              </span>
              <span className="text-lg font-semibold text-zinc-900 tabular-nums">
                {cur} {fmt(total)}
                <span className="text-xs text-zinc-400 font-normal">/m²</span>
              </span>
            </div>

            {/* Element table */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-white/95 backdrop-blur">
                  <tr className="text-[10px] uppercase tracking-wide text-zinc-400 border-b border-zinc-100">
                    <th className="text-left font-medium px-5 py-2">Element</th>
                    <th className="text-right font-medium px-2 py-2">{cur}/m²</th>
                    <th className="text-right font-medium px-5 py-2 w-16">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(({ label, value }) => (
                    <tr key={label} className="border-b border-zinc-50 hover:bg-zinc-50/60">
                      <td className="px-5 py-2">
                        <span className="inline-flex items-center gap-2 min-w-0">
                          <span
                            className="size-2.5 rounded-[3px] shrink-0"
                            style={{ backgroundColor: elementColor(label) }}
                          />
                          <span className="text-zinc-700 truncate">{label}</span>
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-zinc-900">{fmt(value)}</td>
                      <td className="px-5 py-2 text-right tabular-nums text-zinc-500">
                        {total > 0 ? `${Math.round((value / total) * 100)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </aside>
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-2 py-2.5">
      <div className="text-[9px] uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="text-[12px] font-medium text-zinc-800 tabular-nums truncate">{value}</div>
    </div>
  );
}
