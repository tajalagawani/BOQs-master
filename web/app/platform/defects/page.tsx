export const dynamic = "force-dynamic";

import Link from "next/link";
import { Bug, ExternalLink, Clock, ShieldAlert } from "lucide-react";
import { requirePlatformAccess } from "@/lib/platform/auth";
import { parseDefects, getDefectStats } from "@/lib/platform/defects";
import { DefectTable } from "@/components/platform/DefectTable";

export default async function DefectsPage() {
  await requirePlatformAccess();
  const [defects, stats] = await Promise.all([parseDefects(), getDefectStats()]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-500 font-medium inline-flex items-center gap-1.5">
            <Bug className="size-3" strokeWidth={2} /> Quality
          </div>
          <h1 className="mt-1 text-[clamp(22px,2.2vw,28px)] leading-tight font-semibold tracking-tight text-zinc-900">
            Defect Log <span style={{ color: "#60B78C" }}>.</span>
          </h1>
          <p className="mt-1 text-[12.5px] text-zinc-500 max-w-2xl">
            Every defect that reached <code className="text-[11px] bg-zinc-100 px-1 py-0.5 rounded">main</code>{" "}
            post-merge. Closes C5-SC4 Production quality assurance. Sign-off requires{" "}
            <b>0 Critical open</b>.
          </p>
        </div>
        <Link
          href="/platform/docs/quality/defect-log"
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-zinc-200 bg-white text-[12.5px] text-zinc-700 hover:border-zinc-300 hover:text-zinc-900"
        >
          View raw markdown <ExternalLink className="size-3" strokeWidth={1.75} />
        </Link>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat
          label="Open Critical"
          value={stats.openCritical}
          tone={stats.openCritical === 0 ? "emerald" : "rose"}
          icon={<ShieldAlert className="size-3.5" strokeWidth={1.75} />}
          hint={stats.openCritical === 0 ? "Sign-off floor met" : "Blocking sign-off"}
        />
        <Stat
          label="Open total"
          value={stats.openTotal}
          tone={stats.openTotal === 0 ? "emerald" : "amber"}
          icon={<Bug className="size-3.5" strokeWidth={1.75} />}
          hint={`Hi: ${stats.openHigh} · Med: ${stats.openMedium} · Lo: ${stats.openLow}`}
        />
        <Stat
          label="Closed lifetime"
          value={stats.closedTotal}
          tone="zinc"
          icon={<Clock className="size-3.5" strokeWidth={1.75} />}
          hint="Since first deploy 2026-05-31"
        />
        <Stat
          label="Lifetime total"
          value={stats.totalLifetime}
          tone="zinc"
          icon={<Bug className="size-3.5" strokeWidth={1.75} />}
          hint="Sum of open + closed"
        />
      </div>

      <DefectTable defects={defects} />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  icon,
  hint,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "rose" | "zinc";
  icon: React.ReactNode;
  hint?: string;
}) {
  const toneCls =
    tone === "emerald"
      ? { ring: "ring-emerald-100", tile: "bg-emerald-50 text-emerald-700", text: "text-emerald-700" }
      : tone === "amber"
        ? { ring: "ring-amber-100", tile: "bg-amber-50 text-amber-700", text: "text-amber-700" }
        : tone === "rose"
          ? { ring: "ring-rose-100", tile: "bg-rose-50 text-rose-700", text: "text-rose-700" }
          : { ring: "ring-zinc-200", tile: "bg-zinc-900 text-white", text: "text-zinc-900" };
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div
          className={`size-8 rounded-lg inline-flex items-center justify-center ring-1 ${toneCls.tile} ${toneCls.ring}`}
        >
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <div className="text-[10.5px] uppercase tracking-wide text-zinc-500 font-medium">
          {label}
        </div>
        <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneCls.text}`}>
          {value}
        </div>
        {hint && <div className="text-[11px] text-zinc-500 mt-1">{hint}</div>}
      </div>
    </div>
  );
}
