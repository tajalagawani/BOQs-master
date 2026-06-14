/**
 * Shared types + accent maps for the 10X Suite design system.
 *
 * The palette and components are a faithful port of the two reference designs
 * (10x-suite-launcher.html and procurex-step3-10x-style.html). Tokens live in
 * app/globals.css as `suite-*` Tailwind colours; this module only carries the
 * data shapes and the accent → utility-class lookups.
 */

/** The five launcher accents (matches the Product Suite tab dots). */
export type SuiteAccent = "blue" | "amber" | "olive" | "green" | "red";

/** Which mini-preview a launcher card renders in its thumbnail. */
export type SuitePreview =
  | "tenders"
  | "boqs"
  | "cost"
  | "rates"
  | "projects"
  | "soon";

/** Status tone — drives chips, badges, etc. */
export type SuiteTone = "good" | "warn" | "dang" | "neut";

export interface SuiteStat {
  /** Bold mono value, e.g. "10". */
  value: string;
  /** Trailing label, e.g. "active projects". */
  label: string;
}

export interface SuiteApp {
  key: string;
  title: string;
  /** One-line tagline under the title. */
  tag: string;
  /** Route; when omitted the card renders as "Coming soon". */
  href?: string;
  accent: SuiteAccent;
  preview: SuitePreview;
  /** Stat lines shown for active modules (real data). */
  stats?: SuiteStat[];
  /** Feature chips shown for modules without live stats. */
  features?: string[];
  /** Small real values surfaced inside the preview thumbnail. */
  previewData?: {
    title?: string;
    primary?: string;
    primaryLabel?: string;
    secondary?: string;
    secondaryLabel?: string;
    cost?: string;
    location?: string;
    meta?: string;
  };
}

export interface SuiteTabItem {
  key: string;
  label: string;
  dot: SuiteAccent;
}

/* ── accent → utility-class lookups ─────────────────────────────────────── */

/** Solid dot/fill background per accent. */
export const ACCENT_DOT: Record<SuiteAccent, string> = {
  blue: "bg-suite-blue",
  amber: "bg-suite-amber",
  olive: "bg-suite-olive",
  green: "bg-suite-green",
  red: "bg-suite-red",
};

/** Raw hex per accent — for gradients / inline styles where a class won't do. */
export const ACCENT_HEX: Record<SuiteAccent, string> = {
  blue: "#3b6fd6",
  amber: "#e0a83e",
  olive: "#b9a93f",
  green: "#4f9070",
  red: "#c0564d",
};
