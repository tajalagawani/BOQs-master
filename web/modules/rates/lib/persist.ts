/**
 * Small localStorage helper used to keep uploaded tables across reloads.
 * Wrapped in try/catch so we degrade gracefully if the value exceeds
 * the ~5MB-per-origin browser quota.
 */

const VERSION = 1;

export function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(`omnium:v${VERSION}:${key}`);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(
      `omnium:v${VERSION}:${key}`,
      JSON.stringify(value)
    );
    return true;
  } catch {
    // QuotaExceededError or similar — caller decides what to do.
    return false;
  }
}

export function removeJson(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(`omnium:v${VERSION}:${key}`);
  } catch {
    /* ignore */
  }
}
