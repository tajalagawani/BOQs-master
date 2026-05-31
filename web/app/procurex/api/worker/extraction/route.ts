import { NextResponse } from "next/server"

import { drainExtractionQueue } from "@/modules/ai-extraction/queue/worker"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
// Lift from 5 min → 13 min so a single large chunked extraction (e.g.
// 288-page Technical Spec ≈ 100s of small units at MAX_CONCURRENT_UNITS=5)
// can run to completion in one drain instead of being killed mid-way.
// 800s is the upper bound on Vercel Pro serverless functions.
export const maxDuration = 800

/**
 * Extraction queue worker drain.
 *
 * Designed to be invoked by Vercel Cron (every minute) and on-demand
 * after an upload completes. Each call:
 *   1. Reclaims stuck jobs older than 10min
 *   2. Atomically claims oldest queued job (FOR UPDATE SKIP LOCKED)
 *   3. Runs the extraction workflow serially until queue is empty
 *      or 4 minute budget expires
 *
 * Concurrency = 1 per worker process. Multiple concurrent invocations
 * are safe — SKIP LOCKED guarantees no two workers grab the same row.
 */
export async function GET(request: Request): Promise<NextResponse> {
  // Optional auth: a Vercel Cron secret or a worker-shared secret.
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get("authorization") ?? ""
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }
  }

  const outcome = await drainExtractionQueue()
  return NextResponse.json(outcome)
}

export async function POST(request: Request): Promise<NextResponse> {
  return GET(request)
}
