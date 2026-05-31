import { AlertOctagon, AlertTriangle, ServerCrash } from "lucide-react";
import { cn } from "@/lib/cn";
import type { SyslogEntry } from "@/lib/platform/log-analytics";

interface Props {
  entries: SyslogEntry[];
}

export function SyslogList({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="bg-emerald-50/40 border border-emerald-100 rounded-md px-4 py-6 text-center">
        <div className="size-9 mx-auto rounded-full bg-emerald-100 text-emerald-700 inline-flex items-center justify-center">
          <ServerCrash className="size-4" strokeWidth={1.75} />
        </div>
        <p className="mt-2 text-[12px] text-emerald-900 font-medium">
          No errors logged in this window
        </p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-zinc-100 border border-zinc-200 rounded-md overflow-hidden bg-white">
      {entries.map((e, i) => (
        <li key={i} className="px-3.5 py-2.5 hover:bg-zinc-50/60">
          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            <SeverityPill level={e.severityLevel} />
            <span className="text-zinc-500">{e.facility}</span>
            <span className="text-zinc-400">·</span>
            <span className="text-zinc-500 truncate">{e.hostName}</span>
            <time className="ml-auto text-[10.5px] text-zinc-400 tabular-nums">
              {fmt(e.ts)}
            </time>
          </div>
          <div className="mt-1 text-[12px] text-zinc-700 leading-snug font-mono break-words">
            {e.syslogMessage}
          </div>
        </li>
      ))}
    </ul>
  );
}

function SeverityPill({ level }: { level: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    err: {
      label: "Error",
      cls: "bg-rose-50 ring-rose-200 text-rose-700",
      icon: <AlertOctagon className="size-2.5" strokeWidth={2} />,
    },
    crit: {
      label: "Critical",
      cls: "bg-rose-100 ring-rose-300 text-rose-800",
      icon: <AlertOctagon className="size-2.5" strokeWidth={2} />,
    },
    alert: {
      label: "Alert",
      cls: "bg-rose-100 ring-rose-300 text-rose-800",
      icon: <AlertOctagon className="size-2.5" strokeWidth={2} />,
    },
    emerg: {
      label: "Emergency",
      cls: "bg-rose-200 ring-rose-400 text-rose-900",
      icon: <AlertOctagon className="size-2.5" strokeWidth={2} />,
    },
  };
  const it = map[level] ?? {
    label: level,
    cls: "bg-amber-50 ring-amber-200 text-amber-700",
    icon: <AlertTriangle className="size-2.5" strokeWidth={2} />,
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 h-4.5 text-[10px] font-medium ring-1",
        it.cls,
      )}
    >
      {it.icon}
      {it.label}
    </span>
  );
}

function fmt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
