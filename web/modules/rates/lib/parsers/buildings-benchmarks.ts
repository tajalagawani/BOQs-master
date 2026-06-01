import * as XLSX from "xlsx";
import { type Parser, num, str, year } from "./types";

/**
 * Parser for Buildings → Benchmarks.
 *
 * Files: `Building Benchmarks Database - YYYY.MM.DD.xlsx`
 * Sheet: `Data` (1140+ rows). The sibling `Rates` sheet is a small lookup —
 * we ignore it.
 *
 * Header row: row 0 (1-indexed row 1 in Excel).
 *
 * Column mapping ("Data" sheet column → table column):
 *   Asset Lvl 1     → asset
 *   Country         → country
 *   City            → city
 *   Alias Lvl 1     → aliasLvl1
 *   Project Lvl 1   → projectLvl1
 *   Project Lvl 2   → project
 *   Base Date       → baseDate (year)
 *   Contractor      → contractor
 *   Status          → status
 *   Procurement     → procurement
 *   Contract Type   → contractType
 *   BUA             → bua
 *   GIA             → gia
 *   GFA             → gfa
 *   Keys            → keys
 *   NRM Lvl 1       → nrm
 *   Currency        → currency
 *   Total Cost      → totalCost
 *   Cost/BUA        → costBua
 *   Cost/GIA        → costGia
 *   Cost/GFA        → costGfa
 *
 * Rows where `Asset Lvl 1` is blank are skipped (they're spacers/totals).
 */
export const parseBuildingsBenchmarks: Parser = (wb) => {
  const ws = wb.Sheets["Data"];
  if (!ws) return [];

  const aoa = XLSX.utils.sheet_to_json<any[]>(ws, {
    header: 1,
    defval: null,
    blankrows: false,
  });
  if (aoa.length < 2) return [];

  const headers = (aoa[0] ?? []).map((h) =>
    String(h ?? "").trim().toLowerCase()
  );
  const at = (name: string) => headers.indexOf(name.toLowerCase());

  const cols = {
    asset: at("asset lvl 1"),
    country: at("country"),
    city: at("city"),
    aliasLvl1: at("alias lvl 1"),
    projectLvl1: at("project lvl 1"),
    project: at("project lvl 2"),
    baseDate: at("base date"),
    contractor: at("contractor"),
    status: at("status"),
    procurement: at("procurement"),
    contractType: at("contract type"),
    bua: at("bua"),
    gia: at("gia"),
    gfa: at("gfa"),
    keys: at("keys"),
    nrm: at("nrm lvl 1"),
    currency: at("currency"),
    totalCost: at("total cost"),
    costBua: at("cost/bua"),
    costGia: at("cost/gia"),
    costGfa: at("cost/gfa"),
  };

  const pick = (row: any[], idx: number) => (idx >= 0 ? row[idx] : null);

  return aoa
    .slice(1)
    .filter((row) => row && row[cols.asset] != null)
    .map((row, i) => ({
      ref: i + 1,
      asset: str(pick(row, cols.asset)),
      country: str(pick(row, cols.country)),
      city: str(pick(row, cols.city)),
      aliasLvl1: str(pick(row, cols.aliasLvl1)),
      projectLvl1: str(pick(row, cols.projectLvl1)),
      project: str(pick(row, cols.project)),
      baseDate: year(pick(row, cols.baseDate)),
      contractor: str(pick(row, cols.contractor)),
      status: str(pick(row, cols.status)),
      procurement: str(pick(row, cols.procurement)),
      contractType: str(pick(row, cols.contractType)),
      bua: num(pick(row, cols.bua)),
      gia: num(pick(row, cols.gia)),
      gfa: num(pick(row, cols.gfa)),
      keys: num(pick(row, cols.keys)),
      nrm: str(pick(row, cols.nrm)),
      currency: str(pick(row, cols.currency)),
      totalCost: num(pick(row, cols.totalCost)),
      costBua: num(pick(row, cols.costBua)),
      costGia: num(pick(row, cols.costGia)),
      costGfa: num(pick(row, cols.costGfa)),
    }));
};
