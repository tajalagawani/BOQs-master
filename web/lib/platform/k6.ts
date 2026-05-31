import "server-only";

import { readFile, stat, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const TESTS_DIR = resolve(process.cwd(), "tests");
const HISTORY_DIR = join(TESTS_DIR, ".k6-history");

export interface RouteMetric {
  route: string;
  count: number;
  avgMs: number;
  p95Ms: number;
  p99Ms: number;
  errorRate: number;
}

export interface K6Run {
  generatedAt: string;
  baseUrl: string | null;
  iterations: number;
  durationSec: number;
  vusMax: number;
  reqTotal: number;
  reqRate: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  failedPct: number;
  thresholds: { name: string; passed: boolean; description?: string }[];
  routes: RouteMetric[];
  sourcePath: string;
}

export interface K6Point {
  ts: string;
  p95Ms: number;
  errorPct: number;
  iterations: number;
}

/**
 * Read the latest `tests/.last-load-test.json` produced by k6's
 * `handleSummary` (see `web/scripts/load-test.js`). Falls back through
 * a couple of common locations.
 */
export async function getLatestK6Run(): Promise<K6Run | null> {
  const candidates = [
    join(TESTS_DIR, ".last-load-test.json"),
    join(TESTS_DIR, "load-test.json"),
  ];
  for (const path of candidates) {
    try {
      const s = await stat(path);
      if (!s.isFile()) continue;
      const text = await readFile(path, "utf8");
      const data = JSON.parse(text);
      const run = parseK6(data);
      run.generatedAt = new Date(s.mtimeMs).toISOString();
      run.sourcePath = `web/tests/${path.split("/").pop()}`;
      return run;
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function getK6History(limit = 30): Promise<K6Point[]> {
  let entries: string[] = [];
  try {
    entries = await readdir(HISTORY_DIR);
  } catch {
    return [];
  }
  const sorted = entries.filter((f) => f.endsWith(".json")).sort();
  const tail = sorted.slice(-limit);
  const points: K6Point[] = [];
  for (const f of tail) {
    try {
      const path = join(HISTORY_DIR, f);
      const [s, text] = await Promise.all([stat(path), readFile(path, "utf8")]);
      const data = JSON.parse(text);
      const run = parseK6(data);
      points.push({
        ts: new Date(s.mtimeMs).toISOString(),
        p95Ms: run.p95Ms,
        errorPct: run.failedPct,
        iterations: run.iterations,
      });
    } catch {
      /* skip */
    }
  }
  return points;
}

interface K6Summary {
  metrics?: Record<
    string,
    {
      type?: string;
      values?: Record<string, number>;
      submetrics?: { name: string; values: Record<string, number> }[];
      thresholds?: Record<string, { ok: boolean }>;
    }
  >;
  options?: { thresholds?: Record<string, string[]>; stages?: { duration: string; target: number }[] };
}

function parseK6(data: K6Summary): K6Run {
  const m = data.metrics ?? {};
  const dur = m.http_req_duration?.values ?? {};
  const failed = m.http_req_failed?.values ?? {};
  const iter = m.iterations?.values ?? {};
  const vus = m.vus_max?.values ?? {};
  const reqs = m.http_reqs?.values ?? {};

  const routes: RouteMetric[] = [];
  const durByRoute = m.http_req_duration?.submetrics ?? [];
  const failedByRoute = m.http_req_failed?.submetrics ?? [];
  const reqsByRoute = m.http_reqs?.submetrics ?? [];

  const failedMap = new Map<string, number>();
  for (const sm of failedByRoute) {
    const route = extractTagValue(sm.name, "route");
    if (route) failedMap.set(route, sm.values?.rate ?? 0);
  }
  const reqsMap = new Map<string, number>();
  for (const sm of reqsByRoute) {
    const route = extractTagValue(sm.name, "route");
    if (route) reqsMap.set(route, sm.values?.count ?? 0);
  }
  for (const sm of durByRoute) {
    const route = extractTagValue(sm.name, "route");
    if (!route) continue;
    routes.push({
      route,
      count: reqsMap.get(route) ?? 0,
      avgMs: Math.round(sm.values?.avg ?? 0),
      p95Ms: Math.round(sm.values?.["p(95)"] ?? 0),
      p99Ms: Math.round(sm.values?.["p(99)"] ?? 0),
      errorRate: Number(((failedMap.get(route) ?? 0) * 100).toFixed(2)),
    });
  }
  routes.sort((a, b) => b.p95Ms - a.p95Ms);

  const thresholds: K6Run["thresholds"] = [];
  for (const [metricName, metric] of Object.entries(m)) {
    if (!metric.thresholds) continue;
    for (const [name, t] of Object.entries(metric.thresholds)) {
      thresholds.push({ name: `${metricName}: ${name}`, passed: t.ok });
    }
  }

  return {
    generatedAt: "",
    baseUrl: null,
    iterations: Math.round(iter.count ?? 0),
    durationSec: Math.round(iter.rate ? (iter.count ?? 0) / iter.rate : 0),
    vusMax: Math.round(vus.max ?? 0),
    reqTotal: Math.round(reqs.count ?? 0),
    reqRate: Number((reqs.rate ?? 0).toFixed(2)),
    avgMs: Math.round(dur.avg ?? 0),
    p50Ms: Math.round(dur.med ?? dur["p(50)"] ?? 0),
    p95Ms: Math.round(dur["p(95)"] ?? 0),
    p99Ms: Math.round(dur["p(99)"] ?? 0),
    failedPct: Number(((failed.rate ?? 0) * 100).toFixed(2)),
    thresholds,
    routes,
    sourcePath: "",
  };
}

function extractTagValue(submetricName: string, tag: string): string | null {
  // Submetric names look like `{route:/costx,test:iox-smoke}`
  const m = new RegExp(`${tag}:([^,}]+)`).exec(submetricName);
  return m ? m[1] : null;
}
