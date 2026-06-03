/**
 * Project Pulse — shared data contract.
 *
 * The `ProjectPulse` component is purely presentational; it consumes a
 * `ProjectPulseData` object built server-side by a per-module provider in
 * `web/lib/pulse/`. The shape is intentionally **fully serializable** (plain
 * strings/numbers only — no `ReactNode`, no Prisma `Decimal`) because most of
 * the host workspaces are client components, so the data crosses the
 * server→client boundary as props.
 *
 * Icons are referenced by a stable string key (`PulseIconKey`) and mapped to a
 * lucide component inside the presentational layer — never passed across the
 * boundary as JSX.
 */

export type PulseIconKey =
  | "tender"
  | "instruction"
  | "boq"
  | "change-order"
  | "po"
  | "masterplan"
  | "project"
  | "cost"
  | "rate"
  | "calendar"
  | "file";

export type PulseTone = "good" | "warn" | "bad" | "neutral";

export type PulseState = "ok" | "empty" | "error";

export interface PulseMetric {
  iconKey: PulseIconKey;
  /** Tile label, e.g. "Pending Tenders". */
  label: string;
  /** Pre-formatted headline value, e.g. "07", "68%", "₹ 42.36 Cr". */
  value: string;
  /** Optional sub-line, e.g. "5 Overdue" or "18 of 26 BOQs". */
  sub?: string;
  /** Optional drill-down target. */
  href?: string;
}

export interface PulseActivityItem {
  iconKey: PulseIconKey;
  /** Primary line, e.g. "Masterplan 'Tower A' approved". */
  title: string;
  /** Secondary line, e.g. "by Arjun Mehta". */
  by?: string;
  /** Relative time, e.g. "1h ago" (see `formatters.relativeTime`). */
  time: string;
  href?: string;
}

export interface PulseHero {
  /** Rollup title — "CostX Portfolio" / "12 Masterplans" / a project name. */
  title: string;
  /** Location or a one-line breakdown, e.g. "Riyadh, KSA" / "8 active · 4 draft". */
  subtitle?: string;
  /** Span, e.g. "Dec 2024 – Dec 2026". */
  dateRange?: string;
  /** Shows the verified shield next to the title. */
  verified?: boolean;
}

export interface PulseBudget {
  /** "Budget Health" / "Pricing Progress" / "Cost Coverage". */
  label: string;
  /** Status chip text, e.g. "On Track". */
  statusLabel?: string;
  statusTone?: PulseTone;
  /** 0–100. Drives both the headline % and the progress bar width. */
  percent: number;
  /** Caption under the number, e.g. "₹ 128.45 Cr / ₹ 156.00 Cr". */
  caption?: string;
}

export interface ProjectPulseData {
  hero: PulseHero;
  /** Optional — modules without a budget concept omit the whole block. */
  budget?: PulseBudget;
  /** 2–4 metric tiles. */
  metrics: PulseMetric[];
  activity: PulseActivityItem[];
  /** "View all" target for the activity feed. */
  activityHref?: string;
  /** Drives the header status pill; defaults to "ok". */
  state?: PulseState;
}
