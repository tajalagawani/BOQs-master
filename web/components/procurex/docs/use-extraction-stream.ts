"use client"

import { useEffect, useRef, useState } from "react"

export interface LiveProgress {
  iteration: number
  maxIterations: number
  lastAction: string
  tools?: string[]
  stopReason?: string | null
  inputTokens?: number
  outputTokens?: number
  cacheReadTokens?: number
  cacheCreateTokens?: number
  at?: string
}

export interface DoneEvent {
  status: "succeeded" | "failed"
  error?: string
  at?: string
}

/**
 * Subscribe to `/procurex/api/extraction/stream/<documentId>` and surface the
 * latest progress + terminal status. Uses EventSource — browser
 * auto-reconnects on transient drops.
 *
 * Pass `null` to disable (e.g. before the documentId is known).
 */
export function useExtractionStream(documentId: string | null): {
  progress: LiveProgress | null
  done: DoneEvent | null
} {
  const [progress, setProgress] = useState<LiveProgress | null>(null)
  const [done, setDone] = useState<DoneEvent | null>(null)

  useEffect(() => {
    if (!documentId) {
      setProgress(null)
      setDone(null)
      return
    }
    setDone(null)

    const url = `/procurex/api/extraction/stream/${documentId}`
    const es = new EventSource(url)

    es.addEventListener("progress", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as LiveProgress
        setProgress(data)
      } catch {
        /* ignore */
      }
    })

    es.addEventListener("done", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as DoneEvent
        setDone(data)
      } catch {
        /* ignore */
      }
      es.close()
    })

    es.addEventListener("error", () => {
      // EventSource auto-reconnects; nothing to do unless it goes to CLOSED.
      if (es.readyState === EventSource.CLOSED) {
        // give up
      }
    })

    return () => {
      es.close()
    }
  }, [documentId])

  return { progress, done }
}

export interface ProjectLiveMap {
  /** Latest progress per documentId. */
  progressByDoc: Map<string, LiveProgress>
  /** Terminal events per documentId. */
  doneByDoc: Map<string, DoneEvent>
}

/**
 * Single SSE channel for the whole project. Replaces N per-document
 * EventSources with one connection. Returns a Map keyed by documentId
 * — components for a single doc subscribe to its slice via React
 * memoisation.
 *
 * The hook bumps a counter on every event so consumers re-render on
 * change without us having to clone the Map on every update.
 */
export function useProjectExtractionStream(projectId: string | null): {
  liveByDoc: Map<string, LiveProgress>
  doneByDoc: Map<string, DoneEvent>
  /** Increments on every received event — use as a render trigger. */
  tick: number
} {
  const [tick, setTick] = useState(0)
  const liveRef = useRef<Map<string, LiveProgress>>(new Map())
  const doneRef = useRef<Map<string, DoneEvent>>(new Map())

  useEffect(() => {
    if (!projectId) {
      liveRef.current = new Map()
      doneRef.current = new Map()
      setTick((n) => n + 1)
      return
    }

    const url = `/procurex/api/extraction/stream-project/${projectId}`
    const es = new EventSource(url)

    es.addEventListener("progress", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as LiveProgress & {
          documentId?: string
        }
        if (!data.documentId) return
        liveRef.current.set(data.documentId, data)
        setTick((n) => n + 1)
      } catch {
        /* ignore */
      }
    })

    es.addEventListener("done", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as DoneEvent & {
          documentId?: string
        }
        if (!data.documentId) return
        doneRef.current.set(data.documentId, data)
        setTick((n) => n + 1)
      } catch {
        /* ignore */
      }
    })

    return () => {
      es.close()
    }
  }, [projectId])

  return {
    liveByDoc: liveRef.current,
    doneByDoc: doneRef.current,
    tick,
  }
}

/**
 * Accumulating variant — keeps the full history of progress events for
 * a document, so the UI can render a streaming log instead of just the
 * latest line.
 */
export function useExtractionLog(documentId: string | null): {
  events: LiveProgress[]
  done: DoneEvent | null
} {
  const [events, setEvents] = useState<LiveProgress[]>([])
  const [done, setDone] = useState<DoneEvent | null>(null)
  // Dedupe key: iteration + tools join. Mid-turn streaming events and
  // the per-iteration final event can share an iteration number — we
  // overwrite same-iteration entries so the log shows the latest state
  // for that turn, not duplicates.
  const lastIterRef = useRef<number | null>(null)

  useEffect(() => {
    if (!documentId) {
      setEvents([])
      setDone(null)
      return
    }
    setDone(null)
    setEvents([])
    lastIterRef.current = null

    const url = `/procurex/api/extraction/stream/${documentId}`
    const es = new EventSource(url)

    es.addEventListener("progress", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as LiveProgress
        setEvents((prev) => {
          // If this is the same iteration as the previous event,
          // replace the last entry with the newer one (final-of-turn
          // info supersedes mid-turn streaming).
          if (
            prev.length > 0 &&
            prev[prev.length - 1]!.iteration === data.iteration
          ) {
            return [...prev.slice(0, -1), data]
          }
          return [...prev, data]
        })
      } catch {
        /* ignore */
      }
    })

    es.addEventListener("done", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as DoneEvent
        setDone(data)
      } catch {
        /* ignore */
      }
      es.close()
    })

    es.addEventListener("error", () => {
      if (es.readyState === EventSource.CLOSED) {
        /* give up */
      }
    })

    return () => {
      es.close()
    }
  }, [documentId])

  return { events, done }
}
