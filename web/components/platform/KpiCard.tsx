import Link from "next/link";
import { ArrowUpRight, FileText, Layers } from "lucide-react";
import { cn } from "@/lib/cn";
import { statusTone, type Kpi } from "@/lib/platform/kpi-types";
import { StatusPill } from "./StatusPill";

interface Props {
  kpi: Kpi;
  /** Strip the "we have / missing" excerpt to N chars; useful for dense layouts. */
  excerptLen?: number;
}

export function KpiCard({ kpi, excerptLen = 180 }: Props) {
  const tone = statusTone(kpi.status);
  return (
    <Link
      href={`/platform/kpis/${kpi.kpi.toLowerCase()}`}
      className={cn(
        "group relative bg-white border border-suite-line rounded-2xl p-4 h-full flex flex-col gap-3",
        "hover:border-suite-line-2 hover:shadow-[0_8px_30px_-12px_rgba(18,30,55,0.18)] transition-all",
      )}
    >
      {/* Accent rail */}
      <div className={cn("absolute left-0 top-4 bottom-4 w-1 rounded-r-full", tone.bar)} />

      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="suite-num text-[10.5px] font-semibold tracking-wide text-suite-ink-2 bg-suite-card-soft border border-suite-line px-1.5 py-0.5 rounded">
              {kpi.kpi}
            </span>
            <StatusPill status={kpi.status} />
            {kpi.phase > 0 && (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-suite-ink-2 bg-suite-card-soft ring-1 ring-suite-line rounded-full px-2 py-0.5">
                <Layers className="size-2.5" strokeWidth={2} />
                Phase {kpi.phase}
              </span>
            )}
          </div>
          <h3 className="mt-2 text-[13.5px] font-semibold text-suite-ink leading-snug line-clamp-2">
            {kpi.subComponent}
          </h3>
          <p className="mt-0.5 text-[11px] text-suite-ink-2 truncate">{kpi.component}</p>
        </div>
        <ArrowUpRight
          className="size-4 text-suite-ink-4 group-hover:text-suite-ink transition-colors shrink-0"
          strokeWidth={2}
        />
      </div>

      {kpi.weHave && (
        <div className="pl-2 text-[11.5px] text-suite-ink-2 leading-relaxed">
          <span className="text-suite-ink-3 font-medium uppercase tracking-wide text-[10px]">
            Have
          </span>{" "}
          <span className="line-clamp-3">{trim(kpi.weHave, excerptLen)}</span>
        </div>
      )}

      <div className="pl-2 mt-auto flex items-center gap-3 text-[10.5px] text-suite-ink-2">
        <span className="inline-flex items-center gap-1">
          <FileText className="size-2.5" strokeWidth={2} />
          {kpi.evidencePaths.length}{" "}
          {kpi.evidencePaths.length === 1 ? "evidence link" : "evidence links"}
        </span>
        {kpi.missing && kpi.status !== "green" && (
          <span className="truncate">
            <span className="text-suite-ink-3">Gap: </span>
            {trim(kpi.missing, 60)}
          </span>
        )}
      </div>
    </Link>
  );
}

function trim(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n).replace(/\s+\S*$/, "") + "…";
}
