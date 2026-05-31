/**
 * Types + pure helpers shared by server-only data fetchers AND client
 * components. Must NOT import anything that pulls in "server-only".
 */

import type { MatrixStatus } from "./matrix-types";

export interface Kpi {
  kpi: string; // "C1-SC1"
  component: string;
  componentRef: number; // 1..5
  subComponent: string;
  phase: number;
  status: MatrixStatus;
  statusLabel: string;
  weHave: string;
  missing: string;
  evidence: string;
  evidencePaths: string[];
}

export interface KpiTally {
  total: number;
  green: number;
  yellow: number;
  orange: number;
  red: number;
  greenPct: number;
  byComponent: { ref: number; component: string; total: number; green: number }[];
  byPhase: { phase: number; total: number; green: number }[];
}

export const STATUS_BUCKET_ORDER: MatrixStatus[] = ["red", "orange", "yellow", "green"];

export function statusTone(s: MatrixStatus) {
  switch (s) {
    case "green":
      return {
        emoji: "🟢",
        ring: "ring-emerald-200",
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        bar: "bg-emerald-500",
        dot: "bg-emerald-500",
      };
    case "yellow":
      return {
        emoji: "🟡",
        ring: "ring-amber-200",
        bg: "bg-amber-50",
        text: "text-amber-700",
        bar: "bg-amber-400",
        dot: "bg-amber-400",
      };
    case "orange":
      return {
        emoji: "🟠",
        ring: "ring-orange-200",
        bg: "bg-orange-50",
        text: "text-orange-700",
        bar: "bg-orange-500",
        dot: "bg-orange-500",
      };
    case "red":
      return {
        emoji: "🔴",
        ring: "ring-rose-200",
        bg: "bg-rose-50",
        text: "text-rose-700",
        bar: "bg-rose-500",
        dot: "bg-rose-500",
      };
    default:
      return {
        emoji: "⚪",
        ring: "ring-zinc-200",
        bg: "bg-zinc-100",
        text: "text-zinc-600",
        bar: "bg-zinc-300",
        dot: "bg-zinc-400",
      };
  }
}

export function statusLabel(s: MatrixStatus): string {
  return s === "green"
    ? "Met"
    : s === "yellow"
      ? "Substantively met"
      : s === "orange"
        ? "Weak"
        : s === "red"
          ? "Deferred"
          : "Unknown";
}
