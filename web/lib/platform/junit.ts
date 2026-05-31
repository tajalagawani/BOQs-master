import "server-only";

import { readFile, stat, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

/** Candidate roots, in order: web/tests then repo-root tests. */
const TESTS_DIRS = [
  resolve(process.cwd(), "tests"),
  resolve(process.cwd(), "..", "tests"),
];
const HISTORY_DIRS = TESTS_DIRS.map((d) => join(d, ".junit-history"));

export interface TestCase {
  suite: string;
  name: string;
  durationSec: number;
  status: "passed" | "failed" | "skipped";
  failure?: { message: string; type?: string; detail?: string };
}

export interface TestSuite {
  name: string;
  tests: number;
  failures: number;
  errors: number;
  skipped: number;
  durationSec: number;
  cases: TestCase[];
}

export interface TestRun {
  generatedAt: string;
  suites: TestSuite[];
  totals: {
    tests: number;
    passed: number;
    failed: number;
    skipped: number;
    durationSec: number;
    passRate: number;
  };
  /** Path of the file we parsed, relative to repo root */
  sourcePath: string;
}

export interface TestRunPoint {
  ts: string;
  passRate: number;
  passed: number;
  failed: number;
  tests: number;
  durationSec: number;
}

/**
 * Parse the latest JUnit XML report. CI writes to
 * `web/tests/.last-junit.xml` (vitest `--reporter=junit --outputFile=...`).
 * Returns null when no report exists yet — the page renders a friendly
 * "run tests to populate" empty state.
 */
export async function getLatestTestRun(): Promise<TestRun | null> {
  const candidates: string[] = [];
  for (const dir of TESTS_DIRS) {
    candidates.push(join(dir, ".last-junit.xml"), join(dir, "junit.xml"));
  }
  for (const path of candidates) {
    try {
      const s = await stat(path);
      if (!s.isFile()) continue;
      const xml = await readFile(path, "utf8");
      const run = parseJUnit(xml);
      // Show the path relative to the repo root for clarity in the UI.
      const inWebTests = path.includes(`${TESTS_DIRS[0]}/`);
      const filename = path.split("/").pop();
      run.sourcePath = inWebTests ? `web/tests/${filename}` : `tests/${filename}`;
      run.generatedAt = new Date(s.mtimeMs).toISOString();
      return run;
    } catch {
      /* try next */
    }
  }
  return null;
}

/**
 * Look at `.junit-history/*.xml` files for a passing/failing trend.
 * Each filename is expected to be a sortable timestamp prefix.
 */
export async function getTestRunHistory(limit = 30): Promise<TestRunPoint[]> {
  // Use whichever history dir actually exists.
  let historyDir: string | null = null;
  for (const dir of HISTORY_DIRS) {
    try {
      const s = await stat(dir);
      if (s.isDirectory()) {
        historyDir = dir;
        break;
      }
    } catch {
      /* try next */
    }
  }
  if (!historyDir) return [];

  const entries = await readdir(historyDir);
  const xmls = entries.filter((f) => f.endsWith(".xml")).sort();
  const tail = xmls.slice(-limit);
  const points: TestRunPoint[] = [];
  for (const f of tail) {
    try {
      const path = join(historyDir, f);
      const [s, xml] = await Promise.all([stat(path), readFile(path, "utf8")]);
      const run = parseJUnit(xml);
      points.push({
        ts: new Date(s.mtimeMs).toISOString(),
        passRate: run.totals.passRate,
        passed: run.totals.passed,
        failed: run.totals.failed,
        tests: run.totals.tests,
        durationSec: run.totals.durationSec,
      });
    } catch {
      /* skip malformed entry */
    }
  }
  return points;
}

// ─── Parser ──────────────────────────────────────────────────────────────

/**
 * Tiny zero-dep JUnit parser. Covers vitest's `<testsuites>` shape and
 * the common Mocha/Jest shapes. We do NOT pull in a full XML library —
 * the format is constrained enough that a focused regex pass is fine.
 */
function parseJUnit(xml: string): TestRun {
  const suites: TestSuite[] = [];

  for (const m of xml.matchAll(/<testsuite\b([^>]*)>([\s\S]*?)<\/testsuite>/g)) {
    const attrs = parseAttrs(m[1]);
    const body = m[2];
    const cases: TestCase[] = [];
    const suiteName = attrs.name ?? "unnamed";

    for (const cm of body.matchAll(
      /<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g,
    )) {
      const cAttrs = parseAttrs(cm[1]);
      const cBody = cm[2] ?? "";
      const failure = parseFailure(cBody);
      const skipped = /<skipped\b/.test(cBody);
      const status: TestCase["status"] = failure
        ? "failed"
        : skipped
          ? "skipped"
          : "passed";
      cases.push({
        suite: suiteName,
        name: cAttrs.name ?? "(unnamed)",
        durationSec: Number(cAttrs.time ?? "0"),
        status,
        failure,
      });
    }

    suites.push({
      name: suiteName,
      tests: Number(attrs.tests ?? cases.length),
      failures: Number(attrs.failures ?? cases.filter((c) => c.status === "failed").length),
      errors: Number(attrs.errors ?? 0),
      skipped: Number(attrs.skipped ?? cases.filter((c) => c.status === "skipped").length),
      durationSec: Number(attrs.time ?? "0"),
      cases,
    });
  }

  const totals = {
    tests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    durationSec: 0,
    passRate: 0,
  };
  for (const s of suites) {
    totals.tests += s.tests;
    totals.failed += s.failures + s.errors;
    totals.skipped += s.skipped;
    totals.durationSec += s.durationSec;
  }
  totals.passed = Math.max(0, totals.tests - totals.failed - totals.skipped);
  totals.passRate =
    totals.tests > 0 ? Math.round((totals.passed / totals.tests) * 100) : 0;

  return { generatedAt: "", suites, totals, sourcePath: "" };
}

function parseAttrs(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of s.matchAll(/(\w+)="([^"]*)"/g)) out[m[1]] = decode(m[2]);
  return out;
}

function parseFailure(body: string): TestCase["failure"] {
  const m =
    /<failure\b([^>]*)(?:\/>|>([\s\S]*?)<\/failure>)/.exec(body) ??
    /<error\b([^>]*)(?:\/>|>([\s\S]*?)<\/error>)/.exec(body);
  if (!m) return undefined;
  const attrs = parseAttrs(m[1]);
  const detail = m[2]
    ? m[2]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .trim()
    : undefined;
  return {
    message: decode(attrs.message ?? detail?.split("\n")[0] ?? "failure"),
    type: attrs.type,
    detail,
  };
}

function decode(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
