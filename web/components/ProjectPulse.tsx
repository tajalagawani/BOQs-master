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
} from "lucide-react";
import type { ReactNode } from "react";

export interface ProjectPulseAction {
  icon: ReactNode;
  label: string;
  description: string;
  /** Use `href` for navigation, or `onClick` for in-page actions (e.g. open a modal). */
  href?: string;
  onClick?: () => void;
}

const recentActivity = [
  {
    icon: <ShoppingCart className="size-3.5" strokeWidth={1.75} />,
    title: "PO-1256 approved for Steel Rebar Supply",
    by: "by Arjun Mehta",
    time: "1h ago",
  },
  {
    icon: <ClipboardList className="size-3.5" strokeWidth={1.75} />,
    title: "Instruction INS-042 assigned to",
    by: "L&T Construction",
    time: "3h ago",
  },
  {
    icon: <ArrowLeftRight className="size-3.5" strokeWidth={1.75} />,
    title: "Change Order CO-015 submitted",
    by: "for approval",
    time: "5h ago",
  },
];

const metricCards = [
  {
    icon: <Gavel className="size-3.5" strokeWidth={1.75} />,
    label: "Pending Tenders",
    value: "07",
    sub: "₹ 42.36 Cr",
  },
  {
    icon: <ClipboardList className="size-3.5" strokeWidth={1.75} />,
    label: "Open Instructions",
    value: "24",
    sub: "5 Overdue",
  },
  {
    icon: <FileText className="size-3.5" strokeWidth={1.75} />,
    label: "BOQ Progress",
    value: "68%",
    sub: "18 of 26 BOQs",
  },
  {
    icon: <ArrowLeftRight className="size-3.5" strokeWidth={1.75} />,
    label: "Change Orders",
    value: "05",
    sub: "₹ 4.21 Cr Impact",
  },
];

interface ProjectPulseProps {
  /** Optional action tiles rendered at the top, above the project hero. */
  actions?: ProjectPulseAction[];
  /** Optional slot rendered between the actions and the project hero —
      typically a controlled search input owned by a parent client component. */
  searchSlot?: ReactNode;
}

export function ProjectPulse({ actions, searchSlot }: ProjectPulseProps = {}) {
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
        <span className="inline-flex items-center gap-1 text-[9px] font-medium uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Live
        </span>
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
              Skyline Tower
            </span>
            <ShieldCheck className="size-3.5 text-zinc-500" strokeWidth={2} />
          </div>
          <div className="flex items-center gap-1 text-[11px] text-zinc-500 mt-1">
            <MapPin className="size-3" strokeWidth={1.75} />
            <span>Mumbai, India</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-zinc-500 mt-0.5">
            <Calendar className="size-3" strokeWidth={1.75} />
            <span>Dec 2024 – Dec 2026</span>
          </div>
        </div>
      </div>

      {/* Budget Health */}
      <div className="border-t border-zinc-200 pt-3 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-zinc-700">
              Budget Health
            </span>
            <Info className="size-3 text-zinc-400" strokeWidth={1.75} />
          </div>
          <span className="text-[11px] font-medium text-zinc-700 bg-zinc-100 rounded-md px-1.5 py-0.5">
            On Track
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-zinc-900 leading-none">
            82%
          </span>
        </div>
        <div className="text-[11px] text-zinc-500 mt-1">
          ₹ 128.45 Cr / ₹ 156.00 Cr
        </div>
        <div className="mt-1.5 h-1 bg-zinc-100 rounded-full overflow-hidden">
          <div className="h-full bg-zinc-900 rounded-full" style={{ width: "82%" }} />
        </div>
      </div>

      {/* Metric tiles — match ModuleCard inner aesthetic: rounded-xl, zinc-200
          border, subtle hover lift. */}
      <div className="grid grid-cols-2 gap-2 shrink-0">
        {metricCards.map((m) => (
          <div
            key={m.label}
            className="group/tile relative rounded-xl bg-white border border-zinc-200 p-2.5 transition-all duration-200 hover:border-zinc-300 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_-8px_rgba(24,24,27,0.18)] cursor-pointer"
          >
            <div className="flex items-center justify-between text-zinc-500">
              {m.icon}
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
            <div className="text-[10px] text-zinc-500 mt-0.5">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="border-t border-zinc-200 pt-3 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between mb-2 shrink-0">
          <span className="text-xs font-semibold text-zinc-900">
            Recent Activity
          </span>
          <button
            type="button"
            className="text-[11px] text-zinc-600 hover:text-zinc-900"
          >
            View all
          </button>
        </div>
        <ul className="space-y-2 overflow-y-auto pr-1">
          {recentActivity.map((a, i) => (
            <li key={i} className="flex gap-2">
              <div className="size-7 shrink-0 rounded-md bg-zinc-100 inline-flex items-center justify-center text-zinc-700">
                {a.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-zinc-900 leading-snug">
                  {a.title}
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">{a.by}</div>
              </div>
              <div className="text-[10px] text-zinc-400 whitespace-nowrap">
                {a.time}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
