import { AlertOctagon, AlertTriangle, ServerCrash } from "lucide-react";
import { cn } from "@/lib/cn";
import type { SyslogEntry } from "@/lib/platform/log-analytics";

interface Props {
  entries: SyslogEntry[];
}

export function SyslogList({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="bg-suite-good-bg border border-suite-line rounded-md px-4 py-6 text-center">
        <div className="size-9 mx-auto rounded-full bg-suite-good-bg text-suite-good inline-flex items-center justify-center">
          <ServerCrash className="size-4" strokeWidth={1.75} />
        </div>
        <p className="mt-2 text-[12px] text-suite-good font-medium">
          No errors logged in this window
        </p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-suite-line-soft border border-suite-line rounded-md overflow-hidden bg-white">
      {entries.map((e, i) => (
        <li key={i} className="px-3.5 py-2.5 hover:bg-suite-card-soft">
          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            <SeverityPill level={e.severityLevel} />
            <span className="text-suite-ink-3">{e.facility}</span>
            <span className="text-suite-ink-4">·</span>
            <span className="text-suite-ink-3 truncate">{e.hostName}</span>
            <time className="ml-auto text-[10.5px] text-suite-ink-4 suite-num">
              {fmt(e.ts)}
            </time>
          </div>
          <div className="mt-1 text-[12px] text-suite-ink-2 leading-snug font-mono break-words">
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
      cls: "bg-suite-dang-bg ring-suite-dang/30 text-suite-dang",
      icon: <AlertOctagon className="size-2.5" strokeWidth={2} />,
    },
    crit: {
      label: "Critical",
      cls: "bg-suite-dang-bg ring-suite-dang/40 text-suite-dang",
      icon: <AlertOctagon className="size-2.5" strokeWidth={2} />,
    },
    alert: {
      label: "Alert",
      cls: "bg-suite-dang-bg ring-suite-dang/40 text-suite-dang",
      icon: <AlertOctagon className="size-2.5" strokeWidth={2} />,
    },
    emerg: {
      label: "Emergency",
      cls: "bg-suite-dang-bg ring-suite-dang/50 text-suite-dang",
      icon: <AlertOctagon className="size-2.5" strokeWidth={2} />,
    },
  };
  const it = map[level] ?? {
    label: level,
    cls: "bg-suite-warn-bg ring-suite-warn/30 text-suite-warn",
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
