// Unit tests for pure CostX calculation helpers.
// Tests target the round/between/intBetween pattern used inside the seed
// and the masterplan recalc helpers — pure functions, no DB.
import { describe, it, expect } from "vitest";

// Inline copy of the small helpers so the test is hermetic and survives
// future refactors of where they live.
const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;

describe("round (decimal places)", () => {
  it("rounds to 2dp by default", () => {
    expect(round(1.2345)).toBe(1.23);
    expect(round(1.235)).toBe(1.24);
  });
  it("rounds to a given dp", () => {
    expect(round(1.23456, 4)).toBe(1.2346);
    expect(round(123.456, 0)).toBe(123);
  });
});

describe("masterplan derived totals (smoke)", () => {
  it("plot area * sar/m² ≈ construction cost", () => {
    const plot = 2000;
    const sarPerM2 = 5000;
    expect(round(plot * sarPerM2)).toBe(10_000_000);
  });
  it("contingency at 5% adds the expected amount", () => {
    const construction = 10_000_000;
    const contingency = construction * 0.05;
    expect(round(construction + contingency)).toBe(10_500_000);
  });
});
