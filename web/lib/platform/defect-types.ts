/**
 * Types + pure helpers for defect display. Client-safe — must NOT import
 * "server-only" or anything that does.
 */

export type DefectSeverity = "Critical" | "High" | "Medium" | "Low" | "Unknown";
export type DefectState = "open" | "closed";

export interface Defect {
  id: string;
  state: DefectState;
  severity: DefectSeverity;
  module: string;
  title: string;
  date: string;
  ownerOrCommit: string;
  notes: string;
}

export function severityTone(s: DefectSeverity) {
  switch (s) {
    case "Critical":
      return { bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-200" };
    case "High":
      return { bg: "bg-orange-50", text: "text-orange-700", ring: "ring-orange-200" };
    case "Medium":
      return { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200" };
    case "Low":
      return { bg: "bg-zinc-100", text: "text-zinc-700", ring: "ring-zinc-200" };
    default:
      return { bg: "bg-zinc-100", text: "text-zinc-600", ring: "ring-zinc-200" };
  }
}
