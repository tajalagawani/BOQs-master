// Unit tests for the existing number/date formatters used across CostX/BOQs.
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
  it("handles null / undefined gracefully", () => {
    expect(formatNumber(null as unknown as number)).toBe("0");
    expect(formatNumber(undefined as unknown as number)).toBe("0");
  });
});

describe("formatDate", () => {
  it("formats an ISO date as DD MMM YYYY", () => {
    expect(formatDate("2026-03-04T00:00:00.000Z")).toMatch(/\d{2} \w{3} 2026/);
  });
  it("returns a fallback for falsy input", () => {
    expect(formatDate("")).toBe("—");
    expect(formatDate(null as unknown as string)).toBe("—");
  });
});
