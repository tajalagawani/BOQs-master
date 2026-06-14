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
          <div className="text-[11px] uppercase tracking-[0.12em] text-suite-ink-3 font-medium inline-flex items-center gap-1.5">
            <Bug className="size-3" strokeWidth={2} /> Quality
          </div>
          <h1 className="mt-1 text-[clamp(22px,2.2vw,28px)] leading-tight font-semibold tracking-tight text-suite-ink">
            Defect Log <span style={{ color: "#60B78C" }}>.</span>
          </h1>
          <p className="mt-1 text-[12.5px] text-suite-ink-2 max-w-2xl">
            Every defect that reached <code className="text-[11px] bg-suite-card-soft border border-suite-line px-1 py-0.5 rounded">main</code>{" "}
            post-merge. Closes C5-SC4 Production quality assurance. Sign-off requires{" "}
            <b>0 Critical open</b>.
          </p>
        </div>
        <Link
          href="/platform/docs/quality/defect-log"
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-suite-line bg-white text-[12.5px] text-suite-ink-2 hover:border-suite-line-2 hover:text-suite-ink"
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
      ? { ring: "ring-suite-good/20", tile: "bg-suite-good-bg text-suite-good", text: "text-suite-good" }
      : tone === "amber"
        ? { ring: "ring-suite-warn/20", tile: "bg-suite-warn-bg text-suite-warn", text: "text-suite-warn" }
        : tone === "rose"
          ? { ring: "ring-suite-dang/20", tile: "bg-suite-dang-bg text-suite-dang", text: "text-suite-dang" }
          : { ring: "ring-suite-line", tile: "bg-suite-navy text-white", text: "text-suite-ink" };
  return (
    <div className="bg-white border border-suite-line rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div
          className={`size-8 rounded-lg inline-flex items-center justify-center ring-1 ${toneCls.tile} ${toneCls.ring}`}
        >
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <div className="text-[10.5px] uppercase tracking-wide text-suite-ink-3 font-medium">
          {label}
        </div>
        <div className={`mt-1 text-2xl font-semibold suite-num ${toneCls.text}`}>
          {value}
        </div>
        {hint && <div className="text-[11px] text-suite-ink-2 mt-1">{hint}</div>}
      </div>
    </div>
  );
}
