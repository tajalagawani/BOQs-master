/**
 * Local dev-only worker driver.
 *
 * In production, Vercel Cron hits /procurex/api/worker/extraction every
 * minute. Locally there's no cron, so jobs sit in `queued` between
 * UI polls and the spinner reads "Waiting for the agent's first
 * iteration…" indefinitely.
 *
 * Run this in a separate terminal while developing:
 *   npm run dev:worker
 *
 * It pings the worker every 5 seconds. Cheap — when the queue is
 * empty the drain returns immediately.
 */
const WORKER_URL = "http://localhost:3000/procurex/api/worker/extraction";
const INTERVAL_MS = 5_000;

let inflight = false;
let lastNonEmpty = 0;

async function tick() {
  if (inflight) return;
  inflight = true;
  const startedAt = Date.now();
  try {
    const res = await fetch(WORKER_URL, { method: "GET" });
    if (!res.ok) {
      // 401 / 500 / etc — print once, keep trying
      console.warn(`[dev-worker] HTTP ${res.status}`);
      return;
    }
    const body = await res.json();
    const drained = Number(body.drained || 0);
    if (drained > 0) {
      lastNonEmpty = Date.now();
      const ts = new Date().toLocaleTimeString();
      const ms = Date.now() - startedAt;
      console.log(
        `[${ts}] drained=${drained} succeeded=${body.succeeded} failed=${body.failed} requeued=${body.requeued} (${ms}ms)`,
      );
      if (body.results?.length) {
        for (const r of body.results.slice(0, 3)) {
          const tag = r.error ? `  ⚠ ${String(r.error).slice(0, 80)}` : "";
          console.log(
            `  ${String(r.jobId || "").slice(0, 8)} → ${r.status} (${r.iterations ?? 0} iters)${tag}`,
          );
        }
      }
    }
  } catch (err) {
    console.warn(`[dev-worker] fetch failed:`, err instanceof Error ? err.message : err);
  } finally {
    inflight = false;
  }
}

console.log(`[dev-worker] starting — polling ${WORKER_URL} every ${INTERVAL_MS / 1000}s`);
console.log(`[dev-worker] only emits a line when there's actual work; silence = empty queue`);

void tick();
setInterval(tick, INTERVAL_MS);

// Keep process alive (setInterval handles it but be explicit)
process.on("SIGINT", () => {
  console.log("\n[dev-worker] stopping");
  process.exit(0);
});
