import Link from "next/link";
import {
  Activity,
  Calendar,
  MapPin,
  Info,
  Gavel,
  ClipboardList,
  FileText,
  ArrowLeftRight,
  ShoppingCart,
  ShieldCheck,
  ChevronRight,
  ArrowUpRight,
  Map,
  Building2,
  Wallet,
  Tag,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import type {
  ProjectPulseData,
  PulseIconKey,
  PulseTone,
} from "@/lib/pulse/types";

export interface ProjectPulseAction {
  icon: ReactNode;
  label: string;
  description: string;
  /** Use `href` for navigation, or `onClick` for in-page actions (e.g. open a modal). */
  href?: string;
  onClick?: () => void;
}

/** Maps a serializable icon key to its lucide component, so JSX never crosses
 *  the server→client boundary inside `ProjectPulseData`. */
const ICONS: Record<PulseIconKey, LucideIcon> = {
  tender: Gavel,
  instruction: ClipboardList,
  boq: FileText,
  "change-order": ArrowLeftRight,
  po: ShoppingCart,
  masterplan: Map,
  project: Building2,
  cost: Wallet,
  rate: Tag,
  calendar: Calendar,
  file: FileText,
};

/** Status-chip styling for the budget block, keyed by tone. */
const TONE_CHIP: Record<PulseTone, string> = {
  good: "text-emerald-700 bg-emerald-50 border border-emerald-200",
  warn: "text-amber-700 bg-amber-50 border border-amber-200",
  bad: "text-rose-700 bg-rose-50 border border-rose-200",
  neutral: "text-zinc-700 bg-zinc-100",
};

/**
 * Default content — a faithful reproduction of the previously hardcoded widget.
 * Used as a fallback when no `pulse` prop is supplied, so existing call sites
 * keep rendering identically until they are wired to a real provider.
 */
export const DEFAULT_PULSE: ProjectPulseData = {
  hero: {
    title: "Skyline Tower",
    subtitle: "Mumbai, India",
    dateRange: "Dec 2024 – Dec 2026",
    verified: true,
  },
  budget: {
    label: "Budget Health",
    statusLabel: "On Track",
    statusTone: "neutral",
    percent: 82,
    caption: "₹ 128.45 Cr / ₹ 156.00 Cr",
  },
  metrics: [
    { iconKey: "tender", label: "Pending Tenders", value: "07", sub: "₹ 42.36 Cr" },
    { iconKey: "instruction", label: "Open Instructions", value: "24", sub: "5 Overdue" },
    { iconKey: "boq", label: "BOQ Progress", value: "68%", sub: "18 of 26 BOQs" },
    { iconKey: "change-order", label: "Change Orders", value: "05", sub: "₹ 4.21 Cr Impact" },
  ],
  activity: [
    {
      iconKey: "po",
      title: "PO-1256 approved for Steel Rebar Supply",
      by: "by Arjun Mehta",
      time: "1h ago",
    },
    {
      iconKey: "instruction",
      title: "Instruction INS-042 assigned to",
      by: "L&T Construction",
      time: "3h ago",
    },
    {
      iconKey: "change-order",
      title: "Change Order CO-015 submitted",
      by: "for approval",
      time: "5h ago",
    },
  ],
  state: "ok",
};

interface ProjectPulseProps {
  /** Module-specific rollup. Falls back to `DEFAULT_PULSE` when omitted. */
  pulse?: ProjectPulseData;
  /** Optional action tiles rendered at the top, above the project hero. */
  actions?: ProjectPulseAction[];
  /** Optional slot rendered between the actions and the project hero —
      typically a controlled search input owned by a parent client component. */
  searchSlot?: ReactNode;
}

export function ProjectPulse({ pulse, actions, searchSlot }: ProjectPulseProps = {}) {
  const data = pulse ?? DEFAULT_PULSE;
  const state = data.state ?? "ok";

  return (
    // Outer shell — mirrors ModuleCard: white bg, zinc-200 border, rounded-2xl,
    // soft hover lift via shadow + translate.
    <aside className="group iox-card-hover w-[400px] shrink-0 bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col gap-3 h-full overflow-hidden transition-all duration-200 hover:border-zinc-300 hover:shadow-[0_8px_30px_-12px_rgba(24,24,27,0.18)]">
      {/* Header — matches ModuleCard's status-pill row */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <Activity className="size-3.5 text-zinc-700" strokeWidth={1.75} />
          <span className="text-[13px] font-semibold text-zinc-900">
            Project Pulse
          </span>
        </div>
        <StatusPill state={state} />
      </div>

      {/* Optional action tiles — when present, sit above the project hero. */}
      {actions && actions.length > 0 && (
        <div className="grid grid-cols-1 gap-2 shrink-0">
          {actions.map((a, idx) => {
            const inner = (
              <>
                <div className="size-8 shrink-0 rounded-lg bg-zinc-100 inline-flex items-center justify-center text-zinc-700 group-hover/action:bg-zinc-900 group-hover/action:text-white transition-colors duration-200">
                  {a.icon}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-[12px] font-semibold text-zinc-900 leading-tight">
                    {a.label}
                  </div>
                  <div className="text-[10.5px] text-zinc-500 leading-snug truncate">
                    {a.description}
                  </div>
                </div>
                <ArrowUpRight
                  className="size-3.5 text-zinc-400 group-hover/action:text-zinc-900 transition-colors duration-200 shrink-0"
                  strokeWidth={2}
                />
              </>
            );
            const classes =
              "group/action relative rounded-xl bg-white border border-zinc-200 p-2.5 flex items-center gap-2.5 transition-all duration-200 hover:border-zinc-300 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_-8px_rgba(24,24,27,0.18)]";
            if (a.onClick) {
              return (
                <button
                  key={a.label + idx}
                  type="button"
                  onClick={a.onClick}
                  className={classes + " w-full"}
                >
                  {inner}
                </button>
              );
            }
            return (
              <Link key={a.href ?? a.label + idx} href={a.href ?? "#"} className={classes}>
                {inner}
              </Link>
            );
          })}
        </div>
      )}

      {/* Optional search slot — supplied by parent so state can be shared. */}
      {searchSlot && <div className="shrink-0">{searchSlot}</div>}

      {/* Project hero */}
      <div className="flex gap-2.5 shrink-0">
        <div className="size-12 shrink-0 rounded-lg bg-gradient-to-br from-zinc-200 to-zinc-300 inline-flex items-center justify-center">
          <FileText className="size-4 text-zinc-500" strokeWidth={1.5} />
        </div>
        <div className="flex-1 leading-tight">
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-zinc-900">
              {data.hero.title}
            </span>
            {data.hero.verified && (
              <ShieldCheck className="size-3.5 text-zinc-500" strokeWidth={2} />
            )}
          </div>
          {data.hero.subtitle && (
            <div className="flex items-center gap-1 text-[11px] text-zinc-500 mt-1">
              <MapPin className="size-3" strokeWidth={1.75} />
              <span>{data.hero.subtitle}</span>
            </div>
          )}
          {data.hero.dateRange && (
            <div className="flex items-center gap-1 text-[11px] text-zinc-500 mt-0.5">
              <Calendar className="size-3" strokeWidth={1.75} />
              <span>{data.hero.dateRange}</span>
            </div>
          )}
        </div>
      </div>

      {/* Budget Health */}
      {data.budget && (
        <div className="border-t border-zinc-200 pt-3 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-zinc-700">
                {data.budget.label}
              </span>
              <Info className="size-3 text-zinc-400" strokeWidth={1.75} />
            </div>
            {data.budget.statusLabel && (
              <span
                className={`text-[11px] font-medium rounded-md px-1.5 py-0.5 ${
                  TONE_CHIP[data.budget.statusTone ?? "neutral"]
                }`}
              >
                {data.budget.statusLabel}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-zinc-900 leading-none">
              {Math.round(data.budget.percent)}%
            </span>
          </div>
          {data.budget.caption && (
            <div className="text-[11px] text-zinc-500 mt-1">
              {data.budget.caption}
            </div>
          )}
          <div className="mt-1.5 h-1 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-zinc-900 rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, data.budget.percent))}%` }}
            />
          </div>
        </div>
      )}

      {/* Metric tiles — match ModuleCard inner aesthetic: rounded-xl, zinc-200
          border, subtle hover lift. */}
      {data.metrics.length > 0 && (
        <div className="grid grid-cols-2 gap-2 shrink-0">
          {data.metrics.map((m) => {
            const Icon = ICONS[m.iconKey];
            const tile = (
              <>
                <div className="flex items-center justify-between text-zinc-500">
                  <Icon className="size-3.5" strokeWidth={1.75} />
                  <span className="text-[10px] uppercase tracking-wide">
                    {m.label}
                  </span>
                </div>
                <div className="mt-1 flex items-end justify-between">
                  <span className="text-xl font-bold text-zinc-900 leading-none">
                    {m.value}
                  </span>
                  <ChevronRight
                    className="size-3.5 text-zinc-400 transition-transform duration-200 group-hover/tile:translate-x-0.5 group-hover/tile:text-zinc-700"
                    strokeWidth={1.75}
                  />
                </div>
                {m.sub && (
                  <div className="text-[10px] text-zinc-500 mt-0.5">{m.sub}</div>
                )}
              </>
            );
            const tileClasses =
              "group/tile relative rounded-xl bg-white border border-zinc-200 p-2.5 transition-all duration-200 hover:border-zinc-300 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_-8px_rgba(24,24,27,0.18)] cursor-pointer";
            if (m.href) {
              return (
                <Link key={m.label} href={m.href} className={tileClasses + " block"}>
                  {tile}
                </Link>
              );
            }
            return (
              <div key={m.label} className={tileClasses}>
                {tile}
              </div>
            );
          })}
        </div>
      )}

      {/* Recent activity */}
      <div className="border-t border-zinc-200 pt-3 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between mb-2 shrink-0">
          <span className="text-xs font-semibold text-zinc-900">
            Recent Activity
          </span>
          {data.activityHref ? (
            <Link
              href={data.activityHref}
              className="text-[11px] text-zinc-600 hover:text-zinc-900"
            >
              View all
            </Link>
          ) : (
            <button
              type="button"
              className="text-[11px] text-zinc-600 hover:text-zinc-900"
            >
              View all
            </button>
          )}
        </div>
        {data.activity.length > 0 ? (
          <ul className="space-y-2 overflow-y-auto pr-1">
            {data.activity.map((a, i) => {
              const Icon = ICONS[a.iconKey];
              return (
                <li key={i} className="flex gap-2">
                  <div className="size-7 shrink-0 rounded-md bg-zinc-100 inline-flex items-center justify-center text-zinc-700">
                    <Icon className="size-3.5" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-zinc-900 leading-snug">
                      {a.title}
                    </div>
                    {a.by && (
                      <div className="text-[11px] text-zinc-500 mt-0.5">{a.by}</div>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-400 whitespace-nowrap">
                    {a.time}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center px-4">
            <p className="text-[11px] text-zinc-400 leading-snug">
              No recent activity yet. Updates will appear here as work happens
              across this module.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

function StatusPill({ state }: { state: "ok" | "empty" | "error" }) {
  if (state === "error") {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-medium uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
        <span className="size-1.5 rounded-full bg-amber-500" />
        Stale
      </span>
    );
  }
  if (state === "empty") {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-medium uppercase tracking-wide text-zinc-500 bg-zinc-100 border border-zinc-200 rounded-full px-2 py-0.5">
        <span className="size-1.5 rounded-full bg-zinc-400" />
        Idle
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-medium uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
      <span className="size-1.5 rounded-full bg-emerald-500" />
      Live
    </span>
  );
}

/** Streaming placeholder — render inside `<Suspense fallback>` while a
 *  provider resolves. Mirrors the widget's outer shell + section rhythm. */
ProjectPulse.Skeleton = function ProjectPulseSkeleton() {
  return (
    <aside className="w-[400px] shrink-0 bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col gap-3 h-full overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="h-3.5 w-24 rounded bg-zinc-100 animate-pulse" />
        <div className="h-4 w-12 rounded-full bg-zinc-100 animate-pulse" />
      </div>
      <div className="flex gap-2.5 shrink-0">
        <div className="size-12 rounded-lg bg-zinc-100 animate-pulse" />
        <div className="flex-1 space-y-1.5 pt-1">
          <div className="h-3.5 w-32 rounded bg-zinc-100 animate-pulse" />
          <div className="h-2.5 w-24 rounded bg-zinc-100 animate-pulse" />
          <div className="h-2.5 w-28 rounded bg-zinc-100 animate-pulse" />
        </div>
      </div>
      <div className="border-t border-zinc-200 pt-3 space-y-2">
        <div className="h-6 w-16 rounded bg-zinc-100 animate-pulse" />
        <div className="h-1 w-full rounded-full bg-zinc-100 animate-pulse" />
      </div>
      <div className="grid grid-cols-2 gap-2 shrink-0">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 rounded-xl border border-zinc-200 bg-zinc-50 animate-pulse"
          />
        ))}
      </div>
      <div className="border-t border-zinc-200 pt-3 flex-1 space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-2">
            <div className="size-7 rounded-md bg-zinc-100 animate-pulse" />
            <div className="flex-1 space-y-1 pt-0.5">
              <div className="h-2.5 w-full rounded bg-zinc-100 animate-pulse" />
              <div className="h-2.5 w-20 rounded bg-zinc-100 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};
