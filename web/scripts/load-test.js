// IOX load-test script (k6).
//
// Install k6: `brew install k6`  (mac)  |  https://k6.io/docs/get-started/installation
// Run:        `k6 run web/scripts/load-test.js`
// Against VM: `BASE_URL=http://20.203.125.83 k6 run web/scripts/load-test.js`
//
// Stages a gentle ramp to 20 VUs over 2 min, holds, ramps down.
// Targets a mix of public routes; expects every response < 1 s and a 99% success rate.
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:3000";

export const options = {
  stages: [
    { duration: "30s", target:  5 },   // ramp to 5
    { duration: "30s", target: 20 },   // ramp to 20
    { duration: "60s", target: 20 },   // hold
    { duration: "30s", target:  0 },   // ramp down
  ],
  thresholds: {
    http_req_failed:  ["rate<0.01"],     // <1% errors
    http_req_duration: ["p(95)<1000"],   // 95% under 1 s
  },
  // Hide noisy default tags from the summary
  tags: { test: "iox-smoke" },
};

const ROUTES = [
  "/",
  "/costx",
  "/boqs",
  "/benchmarking",
  "/cost-model-rate-analysis",
  "/configuration",
  "/projects",
  "/procurex/sign-in",
];

export default function () {
  const path = ROUTES[Math.floor(Math.random() * ROUTES.length)];
  const res = http.get(`${BASE}${path}`, { tags: { route: path } });

  check(res, {
    [`${path} status is 200`]: (r) => r.status === 200,
    [`${path} body has html`]: (r) => r.body.includes("<html"),
  });

  // Pacing — pretend like a user thinks before clicking again
  sleep(Math.random() * 2);
}

// Export a custom summary that drops k6's verbose default
export function handleSummary(data) {
  return {
    "stdout": textSummary(data),
    "tests/.last-load-test.json": JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  const m = data.metrics;
  const lines = [
    "",
    "  IOX load-test — k6 summary",
    "  ─────────────────────────────────────────",
    `  iterations:        ${(m.iterations?.values?.count ?? 0).toString()}`,
    `  http_req duration: avg=${(m.http_req_duration?.values?.avg ?? 0).toFixed(0)}ms  p95=${(m.http_req_duration?.values?.["p(95)"] ?? 0).toFixed(0)}ms  p99=${(m.http_req_duration?.values?.["p(99)"] ?? 0).toFixed(0)}ms`,
    `  http_req failed:   ${((m.http_req_failed?.values?.rate ?? 0) * 100).toFixed(2)}%`,
    `  vus_max:           ${m.vus_max?.values?.max ?? "?"}`,
    "",
  ];
  return lines.join("\n");
}
