export const dynamic = "force-dynamic";

import { History, Users, Activity, Layers } from "lucide-react";
import { requirePlatformAccess } from "@/lib/platform/auth";
import { listAuditEvents, getAuditStats } from "@/lib/platform/audit";
import { AuditTable } from "@/components/platform/AuditTable";

export default async function AuditPage() {
  await requirePlatformAccess();
  const events = await listAuditEvents();
  const stats = await getAuditStats(events);

  return (
    <div className="mx-auto max-w-6xl px-6 py-6 space-y-5">
      <header>
        <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-500 font-medium inline-flex items-center gap-1.5">
          <History className="size-3" strokeWidth={2} /> Activity
        </div>
        <h1 className="mt-1 text-[clamp(22px,2.2vw,28px)] leading-tight font-semibold tracking-tight text-zinc-900">
          Audit log <span style={{ color: "#60B78C" }}>.</span>
        </h1>
        <p className="mt-1 text-[12.5px] text-zinc-500 max-w-3xl">
          Cross-module activity stream. Live UNION of Prisma{" "}
          <code className="text-[11px] bg-zinc-100 px-1 py-0.5 rounded">activity_logs</code> (IOX
          modules) and Drizzle{" "}
          <code className="text-[11px] bg-zinc-100 px-1 py-0.5 rounded">px_audit_log</code>{" "}
          (ProcureX). Newest first, capped at 200.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat
          label="Events (last 200)"
          value={stats.total}
          icon={<Activity className="size-3.5" strokeWidth={1.75} />}
        />
        <Stat
          label="IOX modules"
          value={stats.iox}
          icon={<Layers className="size-3.5" strokeWidth={1.75} />}
          hint="CostX, BOQs, Configuration, …"
        />
        <Stat
          label="ProcureX"
          value={stats.procurex}
          icon={<Layers className="size-3.5" strokeWidth={1.75} />}
          hint="Tender, vendor, bid"
        />
        <Stat
          label="Distinct actors"
          value={stats.topActors.length}
          icon={<Users className="size-3.5" strokeWidth={1.75} />}
          hint={stats.topActors.slice(0, 1).map((a) => `Most: ${a.actor}`).join("")}
        />
      </div>

      {(stats.topActions.length > 0 || stats.topActors.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <RankCard title="Top actions" rows={stats.topActions.map((a) => ({ label: a.action, count: a.count }))} />
          <RankCard title="Top actors" rows={stats.topActors.map((a) => ({ label: a.actor, count: a.count }))} />
        </div>
      )}

      <AuditTable events={events} />
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-4">
      <div className="size-8 rounded-lg bg-zinc-900 text-white ring-1 ring-zinc-200 inline-flex items-center justify-center">
        {icon}
      </div>
      <div className="mt-3 text-[10.5px] uppercase tracking-wide text-zinc-500 font-medium">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">{value}</div>
      {hint && <div className="text-[11px] text-zinc-500 mt-1 truncate">{hint}</div>}
    </div>
  );
}

function RankCard({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; count: number }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className="bg-white border border-zinc-200 rounded-2xl p-4">
      <header className="mb-3">
        <h2 className="text-[12.5px] font-semibold text-zinc-900">{title}</h2>
      </header>
      {rows.length === 0 ? (
        <p className="text-[11.5px] text-zinc-400">No data</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center gap-3">
              <span className="text-[11.5px] text-zinc-700 min-w-0 flex-1 truncate">
                {r.label}
              </span>
              <div className="flex-1 h-2 rounded-full bg-zinc-100 overflow-hidden max-w-[140px]">
                <div
                  className="h-full bg-zinc-900"
                  style={{ width: `${(r.count / max) * 100}%` }}
                />
              </div>
              <span className="text-[11px] text-zinc-700 tabular-nums w-8 text-right">
                {r.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
