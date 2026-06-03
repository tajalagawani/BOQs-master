// Unit tests for the Project Pulse presentation formatters
// (web/lib/pulse/formatters.ts). Pure functions — no DB, no network.
import { describe, it, expect } from "vitest";
import {
  formatMoney,
  formatPercent,
  pad2,
  relativeTime,
  formatDateRange,
} from "@/lib/pulse/formatters";

describe("formatMoney", () => {
  it("formats INR in crore / lakh (legacy widget convention)", () => {
    expect(formatMoney(1_284_500_000, "INR")).toBe("₹ 128.45 Cr");
    expect(formatMoney(423_600_000, "INR")).toBe("₹ 42.36 Cr");
    expect(formatMoney(250_000, "INR")).toBe("₹ 2.50 L");
  });
  it("defaults to INR", () => {
    expect(formatMoney(10_000_000)).toBe("₹ 1.00 Cr");
  });
  it("formats non-INR currencies on a B/M/K scale", () => {
    expect(formatMoney(1_200_000, "SAR")).toBe("SAR 1.20 M");
    expect(formatMoney(2_500_000_000, "USD")).toBe("$ 2.50 B");
    expect(formatMoney(4_500, "GBP")).toBe("£ 4.5 K");
  });
  it("returns an em-dash for non-finite input", () => {
    expect(formatMoney(NaN)).toBe("—");
    expect(formatMoney(Infinity)).toBe("—");
  });
});

describe("formatPercent", () => {
  it("rounds to the requested precision", () => {
    expect(formatPercent(82)).toBe("82%");
    expect(formatPercent(67.6, 1)).toBe("67.6%");
  });
  it("guards non-finite input", () => {
    expect(formatPercent(NaN)).toBe("—");
  });
});

describe("pad2", () => {
  it("zero-pads single digits", () => {
    expect(pad2(7)).toBe("07");
    expect(pad2(0)).toBe("00");
  });
  it("leaves multi-digit values alone", () => {
    expect(pad2(24)).toBe("24");
    expect(pad2(146)).toBe("146");
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-06-03T12:00:00.000Z");
  it("buckets recent times", () => {
    expect(relativeTime(new Date("2026-06-03T11:59:30.000Z"), now)).toBe("just now");
    expect(relativeTime(new Date("2026-06-03T11:45:00.000Z"), now)).toBe("15m ago");
    expect(relativeTime(new Date("2026-06-03T09:00:00.000Z"), now)).toBe("3h ago");
    expect(relativeTime(new Date("2026-06-01T12:00:00.000Z"), now)).toBe("2d ago");
  });
  it("accepts ISO strings", () => {
    expect(relativeTime("2026-05-27T12:00:00.000Z", now)).toBe("1w ago");
  });
});

describe("formatDateRange", () => {
  it("joins both ends", () => {
    expect(formatDateRange("2024-12-01", "2026-12-01")).toBe("Dec 2024 – Dec 2026");
  });
  it("returns a single end when the other is missing", () => {
    expect(formatDateRange("2024-12-01", null)).toBe("Dec 2024");
    expect(formatDateRange(null, "2026-12-01")).toBe("Dec 2026");
  });
  it("returns undefined when both are missing", () => {
    expect(formatDateRange(null, undefined)).toBeUndefined();
  });
});
