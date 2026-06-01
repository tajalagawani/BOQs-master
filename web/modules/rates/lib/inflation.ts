/**
 * Annual inflation factors used to bring historical project benchmarks to
 * a common reference year.
 *
 * Source: the "Inflation Adjustment Calculator" dropdown from the source
 * benchmarking spreadsheet (UAE-weighted construction inflation).
 *
 *   inflateFactor(baseYear, refYear)
 *     → compound multiplier to scale a cost-per-m² captured in baseYear
 *       to its equivalent in refYear (both inclusive).
 *     Years beyond the table cap to the last known value.
 */

export const INFLATION_BY_YEAR: Record<number, number> = {
  2000: 0.0135,
  2001: 0.028,
  2002: 0.029,
  2003: 0.031,
  2004: 0.05,
  2005: 0.062,
  2006: 0.093,
  2007: 0.111,
  2008: 0.1225,
  2009: 0.0156,
  2010: 0.0088,
  2011: 0.0088,
  2012: 0.0086,
  2013: 0.011,
  2014: 0.0235,
  2015: 0.0407,
  2016: 0.0162,
  2017: 0.0197,
  2018: 0.0307,
  2019: -0.0193,
  2020: -0.0208,
  2021: -0.0011,
  2022: 0.0483,
  2023: 0.0312,
  2024: 0.023,
  2025: 0.021,
  2026: 0.02,
  2027: 0.02,
  2028: 0.02,
  2029: 0.02,
  2030: 0.02,
};

export function inflateFactor(baseYear: number, refYear: number): number {
  if (baseYear === refYear) return 1;
  if (baseYear > refYear) return 1; // future projects (rare) — don't deflate
  let factor = 1;
  for (let y = baseYear + 1; y <= refYear; y++) {
    const rate = INFLATION_BY_YEAR[y] ?? INFLATION_BY_YEAR[2030] ?? 0.02;
    factor *= 1 + rate;
  }
  return factor;
}

/** Years offered in the "Adjust to year" dropdown. */
export const INFLATION_REFERENCE_YEARS = Object.keys(INFLATION_BY_YEAR)
  .map(Number)
  .sort((a, b) => a - b);
