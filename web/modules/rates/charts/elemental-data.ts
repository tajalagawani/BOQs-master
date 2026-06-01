// Shared data transforms for the Elemental-by-Project views.
// Both the Composition (stacked) and Distribution (strip) charts derive their
// numbers from the same per-project, per-element, inflation-adjusted values.

import type { ElementalProject, ElementalSlice } from "@/modules/rates/lib/db/queries";
import { inflateFactor } from "@/modules/rates/lib/inflation";

export type Basis = "BUA" | "GIA" | "GFA";
export type ElementalView = "composition" | "distribution";

export function pickValue(slice: ElementalSlice, basis: Basis): number {
  const v =
    basis === "BUA" ? slice.costPerBua
    : basis === "GIA" ? slice.costPerGia
    : slice.costPerGfa;
  return v ?? 0;
}

/** Inflation multiplier for a project's base year → reference year. */
export function projectFactor(
  p: ElementalProject,
  refYear: number,
  inflationOn: boolean,
): number {
  return inflationOn && p.baseYear ? inflateFactor(p.baseYear, refYear) : 1;
}

export interface ElementValue {
  label: string;
  value: number; // inflation-adjusted cost per m² for the chosen basis
}

/** Non-zero, inflation-adjusted element values for one project.
 *  A project can carry several benchmark rows for the same NRM L1 element
 *  (different blocks / phases, or a 0 placeholder + a real value). We collapse
 *  them to one value per element — the mean of the non-zero rows — so a
 *  per-m² rate is never double-counted and every consumer sees one entry per
 *  element. */
export function projectElementValues(
  p: ElementalProject,
  basis: Basis,
  refYear: number,
  inflationOn: boolean,
): ElementValue[] {
  const factor = projectFactor(p, refYear, inflationOn);
  const agg = new Map<string, { sum: number; n: number }>();
  for (const s of p.stack) {
    const v = pickValue(s, basis) * factor;
    if (v > 0) {
      const g = agg.get(s.nrmLabel) ?? { sum: 0, n: 0 };
      g.sum += v;
      g.n += 1;
      agg.set(s.nrmLabel, g);
    }
  }
  return [...agg].map(([label, g]) => ({ label, value: Math.round(g.sum / g.n) }));
}

export function projectTotal(values: ElementValue[]): number {
  return values.reduce((sum, e) => sum + e.value, 0);
}

/** Five-number summary for a sorted-or-unsorted numeric array. */
export interface Quartiles {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  n: number;
}

export function quartiles(values: number[]): Quartiles | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const at = (q: number) => {
    const idx = (s.length - 1) * q;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (idx - lo);
  };
  return {
    min: s[0],
    q1: at(0.25),
    median: at(0.5),
    q3: at(0.75),
    max: s[s.length - 1],
    n: s.length,
  };
}

/** Compact axis tick formatter — 1.2M / 340k / 90. */
export function compactNumber(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return `${Math.round(v)}`;
}

export function fmt(v: number): string {
  return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
