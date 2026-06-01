import { schemaKey } from "../schemas";
import type { Parser } from "./types";
import { parseBuildingsBenchmarks } from "./buildings-benchmarks";

/**
 * Registry of explicit per-(section, tab) parsers.
 *
 * When a parser is registered, the upload dialog uses it instead of the
 * generic alias-based mapper. To add a new file format:
 *
 *   1. Create `lib/parsers/<section>-<tab>.ts` exporting a `Parser`
 *   2. Register it here
 *
 * Tabs without an entry fall back to the generic mapper in `upload-mapper.ts`.
 */
export const PARSERS: Record<string, Parser> = {
  [schemaKey("Buildings", "Benchmarks")]: parseBuildingsBenchmarks,
};

export function getParser(section: string, tab: string): Parser | null {
  return PARSERS[schemaKey(section, tab)] ?? null;
}
