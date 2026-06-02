// Unit tests for the number/date formatters used across CostX/BOQs.
// Assertions track the actual implementation in web/utils/formatters.ts
// (hyphen "-" fallback; formatDate returns YYYY-MM-DD).
import { describe, it, expect } from "vitest";
import { formatNumber, formatDate } from "@/utils/formatters";

describe("formatNumber", () => {
  it("formats integers with thousands separators", () => {
    expect(formatNumber(1000)).toBe("1,000");
    expect(formatNumber(1234567)).toBe("1,234,567");
  });
  it("handles zero + small numbers", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(1)).toBe("1");
  });
  it("returns a hyphen fallback for null / undefined", () => {
    expect(formatNumber(null as unknown as number)).toBe("-");
    expect(formatNumber(undefined as unknown as number)).toBe("-");
  });
});

describe("formatDate", () => {
  it("formats an ISO date as YYYY-MM-DD", () => {
    expect(formatDate("2026-03-04T00:00:00.000Z")).toBe("2026-03-04");
  });
  it("returns a hyphen fallback for falsy input", () => {
    expect(formatDate("")).toBe("-");
    expect(formatDate(null as unknown as string)).toBe("-");
  });
});
