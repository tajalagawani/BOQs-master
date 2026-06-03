// POMI code table — loaded once, used for the AI classifier's reference + to
// validate that returned codes are real.

import { readFile } from "node:fs/promises";
import path from "node:path";

export type PomiCode = {
  section: string;
  code: string;
  description: string;   // leaf text (often a sub-list fragment)
  clause?: string;       // the measured clause (L2) this code sits under
  full_text?: string;    // full ancestor chain: section › sub-section › clause › item
  nrm_code: string;
  nrm_desc: string;
  measurement: string;
};

let _codes: PomiCode[] | null = null;
let _byCode: Map<string, PomiCode> | null = null;
let _tableText: string | null = null;

export async function loadCodes(): Promise<PomiCode[]> {
  if (_codes) return _codes;
  const file = path.join(process.cwd(), "engine", "pomi_codes.json");
  _codes = JSON.parse(await readFile(file, "utf-8")) as PomiCode[];
  _byCode = new Map(_codes.map((c) => [c.code, c]));
  return _codes;
}

export async function byCode(): Promise<Map<string, PomiCode>> {
  if (!_byCode) await loadCodes();
  return _byCode!;
}

// Compact reference table for the model. One line per code; cached in the prompt
// so the full table is only paid for once per cache window.
export async function codeTableText(): Promise<string> {
  if (_tableText) return _tableText;
  const codes = await loadCodes();
  // Give the model the FULL clause text (ancestor chain), not just the leaf
  // fragment — this is what lets it disambiguate sub-list items correctly.
  _tableText = codes
    .map((c) => `${c.code}\t${c.section}\t${c.measurement}\t${c.full_text || c.description}`)
    .join("\n");
  return _tableText;
}
