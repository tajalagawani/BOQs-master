/**
 * Routes a freshly-parsed (section, tab) upload to the right v2 loader.
 *
 * The Omnium UI sends section + tab as the human labels ("Buildings",
 * "Rates"); this file maps those to the `rates_dim_section.code` slug and
 * then dispatches to one of the four loaders. Section/tab pairs that
 * aren't priced/quantified yet (e.g. "Market Testing Log") fall through
 * to a no-op result.
 */

import { loadRateItems,         type LoadRateItemsResult }    from "./load-rates";
import { loadProjectBenchmarks, type LoadBenchmarksResult }   from "./load-benchmarks";
import { loadDesignRatios,      type LoadDesignRatiosResult } from "./load-design-ratios";
import { loadMaterialPrices,    type LoadMaterialsResult }    from "./load-materials";

/** Section label → seed code in `rates_dim_section`. */
export const SECTION_CODE: Record<string, string> = {
  Buildings:              "buildings",
  Infrastructure:         "infrastructure",
  Industrial:             "industrial",
  "Utility Buildings":    "utility_buildings",
  "Public Realm":         "public_realm",
  Marine:                 "marine",
  Piling:                 "piling",
  "Ground Investigation": "ground_investigation",
  Stadium:                "stadium",
  Materials:              "materials",
  "Market Testing Log":   "market_testing_log",
};

/** Which loader handles each (section, tab). */
type LoaderKind = "rates" | "benchmarks" | "design_ratios" | "materials" | "noop";

function pickLoader(sectionLabel: string, tabLabel: string): LoaderKind {
  // Tab-name first — covers all the "*Rates*", "*Benchmarks*", "*Materials*" cases.
  const t = tabLabel.toLowerCase();

  if (tabLabel === "Design Ratios") return "design_ratios";
  if (sectionLabel === "Materials") return "materials";

  // "Rates & Benchmarks" is a hybrid sheet that's effectively item-level rates.
  if (t === "rates & benchmarks") return "rates";

  if (t.includes("benchmark")) return "benchmarks";
  if (t.includes("rate"))      return "rates";

  return "noop";
}

export type DispatchResult =
  | { kind: "rates";         result: LoadRateItemsResult }
  | { kind: "benchmarks";    result: LoadBenchmarksResult }
  | { kind: "design_ratios"; result: LoadDesignRatiosResult }
  | { kind: "materials";     result: LoadMaterialsResult }
  | { kind: "noop";          result: { reason: string } };

export interface DispatchArgs {
  sectionLabel: string;
  tabLabel: string;
  // The UI hands us a `parsedRows` object array (canonical schema keys) OR a
  // generic `rows` array of array-of-cells. Loaders all want the canonical
  // shape — that's what the per-tab parsers produce.
  rows: Record<string, unknown>[];
  upload: {
    fileName: string;
    sizeBytes: number;
    sheetName?: string | null;
    parserName: string;
    parserVersion?: string | null;
    schemaVersion?: string | null;
    uploadedById?: string | null;
    extraColumns?: unknown;
    rawSample?: unknown;
  };
}

export async function dispatchUpload(args: DispatchArgs): Promise<DispatchResult> {
  const sectionCode = SECTION_CODE[args.sectionLabel];
  if (!sectionCode) {
    return { kind: "noop", result: { reason: `unknown section: ${args.sectionLabel}` } };
  }

  const kind = pickLoader(args.sectionLabel, args.tabLabel);

  // No quantified data yet — log the upload row but skip fact insertion.
  if (kind === "noop") {
    return { kind: "noop", result: { reason: `tab '${args.tabLabel}' has no loader` } };
  }

  const common = {
    sectionCode,
    tabLabel: args.tabLabel,
    rows: args.rows as never, // narrowed per branch below
    upload: args.upload,
  };

  switch (kind) {
    case "rates":
      return { kind, result: await loadRateItems(common) };
    case "benchmarks":
      return { kind, result: await loadProjectBenchmarks(common) };
    case "design_ratios":
      return { kind, result: await loadDesignRatios(common) };
    case "materials":
      return { kind, result: await loadMaterialPrices(common) };
  }
}
