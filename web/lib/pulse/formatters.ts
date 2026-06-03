/**
 * Project Pulse — pure presentation formatters.
 *
 * No imports, no I/O, no `server-only` — safe to use on either side of the
 * boundary and trivially unit-testable. Money formatting mirrors the existing
 * UI convention (INR crore/lakh, e.g. "₹ 42.36 Cr"); other currencies fall
 * back to a generic B/M/K scale.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  GBP: "£",
  EUR: "€",
  JPY: "¥",
  SAR: "SAR",
  AED: "AED",
  QAR: "QAR",
};

/**
 * Format a monetary amount for a metric tile or caption.
 * INR uses Indian crore/lakh; everything else uses B/M/K.
 *
 * @param amount  Value in major units (NOT cents — divide `*_cents` by 100 first).
 * @param currency ISO code; defaults to INR to match the legacy widget.
 */
export function formatMoney(amount: number, currency = "INR"): string {
  if (!Number.isFinite(amount)) return "—";
  const cur = (currency || "INR").toUpperCase();
  const sym = CURRENCY_SYMBOLS[cur] ?? cur;
  const abs = Math.abs(amount);

  if (cur === "INR") {
    if (abs >= 1e7) return `₹ ${(amount / 1e7).toFixed(2)} Cr`;
    if (abs >= 1e5) return `₹ ${(amount / 1e5).toFixed(2)} L`;
    return `₹ ${Math.round(amount).toLocaleString("en-IN")}`;
  }

  if (abs >= 1e9) return `${sym} ${(amount / 1e9).toFixed(2)} B`;
  if (abs >= 1e6) return `${sym} ${(amount / 1e6).toFixed(2)} M`;
  if (abs >= 1e3) return `${sym} ${(amount / 1e3).toFixed(1)} K`;
  return `${sym} ${Math.round(amount).toLocaleString("en-US")}`;
}

/** Format a 0–100 ratio as a percent string. */
export function formatPercent(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

/** Zero-pad small counts to two digits ("7" → "07"), matching the widget. */
export function pad2(n: number): string {
  const i = Math.max(0, Math.trunc(n));
  return i < 10 ? `0${i}` : String(i);
}

/**
 * Compact relative time, e.g. "just now", "5m ago", "3h ago", "2d ago".
 * `now` is injectable so tests stay deterministic.
 */
export function relativeTime(
  input: Date | string | number,
  now: Date = new Date(),
): string {
  const then = input instanceof Date ? input : new Date(input);
  const ms = now.getTime() - then.getTime();
  if (!Number.isFinite(ms)) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

/** "Dec 2024 – Dec 2026" style range from two dates (either side optional). */
export function formatDateRange(
  start?: Date | string | null,
  end?: Date | string | null,
): string | undefined {
  const fmt = (d?: Date | string | null) => {
    if (!d) return undefined;
    const date = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };
  const a = fmt(start);
  const b = fmt(end);
  if (a && b) return `${a} – ${b}`;
  return a ?? b ?? undefined;
}
