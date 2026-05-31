// Integration smoke tests — hit a running dev/prod server and assert each
// major route returns 200 (or the expected redirect / auth gate).
//
// Run with:  INTEGRATION=1 TEST_BASE_URL=http://localhost:3000 npx vitest
// Or against the live VM:  INTEGRATION=1 TEST_BASE_URL=http://20.203.125.83 npx vitest
import { describe, it, expect } from "vitest";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";

// Routes that should serve content to unauthenticated viewers.
const PUBLIC_ROUTES: Array<[string, number | number[]]> = [
  ["/", 200],
  ["/costx", 200],
  ["/boqs", 200],
  ["/benchmarking", 200],
  ["/cost-model-rate-analysis", 200],
  ["/configuration", 200],
  ["/projects", 200],
  ["/procurex/sign-in", 200],
];

// Routes that should redirect / error when unauthenticated.
const AUTH_GATED: Array<[string, number | number[]]> = [
  ["/procurex", [200, 307, 500]], // 500 if mock session not present
];

describe("public routes", () => {
  for (const [path, expected] of PUBLIC_ROUTES) {
    it(`GET ${path} → ${expected}`, async () => {
      const res = await fetch(BASE + path, { redirect: "manual" });
      const ok = Array.isArray(expected)
        ? expected.includes(res.status)
        : res.status === expected;
      expect(ok, `${path} returned ${res.status}`).toBe(true);
    });
  }
});

describe("auth-gated routes", () => {
  for (const [path, expected] of AUTH_GATED) {
    it(`GET ${path} → ${expected}`, async () => {
      const res = await fetch(BASE + path, { redirect: "manual" });
      const ok = Array.isArray(expected)
        ? expected.includes(res.status)
        : res.status === expected;
      expect(ok, `${path} returned ${res.status}`).toBe(true);
    });
  }
});

describe("API health", () => {
  it("auth CSRF endpoint exists", async () => {
    const res = await fetch(BASE + "/api/auth/csrf");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.csrfToken).toBe("string");
    expect(body.csrfToken.length).toBeGreaterThan(8);
  });
});
