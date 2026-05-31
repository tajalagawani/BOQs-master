import "server-only"

import { EventEmitter } from "node:events"

/**
 * In-process pub/sub for live agent progress events.
 *
 * Producers (the agent runner) call `publish(documentId, event)` after
 * each iteration or mid-turn content block.
 *
 * Consumers (the SSE route handler) call `subscribe(documentId, fn)`
 * and receive every event published for that documentId until they
 * call the returned `unsubscribe()` function.
 *
 * Limitation: in-process only. If you scale to multiple Node instances
 * the bus needs to be backed by Redis pub/sub or similar — but for
 * single-instance dev + small prod deployments this is enough.
 */
export interface ProgressEvent {
  type: "progress" | "done" | "error"
  /** Iteration number, when applicable. */
  iteration?: number
  maxIterations?: number
  /** Short human-readable line. */
  lastAction?: string
  /** Tool names on this turn. */
  tools?: string[]
  /** "streaming" while mid-turn, otherwise Anthropic stop_reason. */
  stopReason?: string | null
  inputTokens?: number
  outputTokens?: number
  cacheReadTokens?: number
  cacheCreateTokens?: number
  /** Terminal: agent finished. */
  status?: "succeeded" | "failed"
  error?: string
  /** ISO timestamp when the producer emitted this event. */
  at: string
}

// Stash bus + buffers on globalThis so Next.js hot reload doesn't lose
// the in-flight subscriber list and event ring buffers. Without this,
// each edit causes the worker (writing) and the SSE route (subscribing)
// to end up on different bus instances and events drop silently.
type BusGlobals = {
  __procurexBus?: EventEmitter
  __procurexBuffers?: Map<string, ProgressEvent[]>
}
const g = globalThis as unknown as BusGlobals

const bus = (g.__procurexBus ??= new EventEmitter())
// We can have many concurrent SSE subscribers in dev (hot reload, multiple
// tabs). The default 10-listener cap fires spurious warnings.
bus.setMaxListeners(0)

// Per-document ring buffer of recent events. Late subscribers (page
// reload, panel mount mid-run) get the recent history replayed so they
// can show the agent's full log instead of starting blank.
const BUFFER_SIZE = 1000
const buffers: Map<string, ProgressEvent[]> = (g.__procurexBuffers ??= new Map())

function docChannel(documentId: string): string {
  return `doc:${documentId}`
}
function projectChannel(projectId: string): string {
  return `proj:${projectId}`
}

/**
 * Project-scoped events also carry the documentId so subscribers can
 * route by document without N separate channels.
 */
export interface ProjectProgressEvent extends ProgressEvent {
  documentId: string
}

export function publishProgress(
  documentId: string,
  event: ProgressEvent,
  projectId?: string,
): void {
  const buf = buffers.get(documentId) ?? []
  buf.push(event)
  if (buf.length > BUFFER_SIZE) buf.splice(0, buf.length - BUFFER_SIZE)
  buffers.set(documentId, buf)
  if (event.type === "done") {
    setTimeout(() => buffers.delete(documentId), 5 * 60_000)
  }
  bus.emit(docChannel(documentId), event)
  if (projectId) {
    bus.emit(projectChannel(projectId), { ...event, documentId })
  }
}

export function subscribeProgress(
  documentId: string,
  handler: (event: ProgressEvent) => void,
): () => void {
  const ch = docChannel(documentId)
  bus.on(ch, handler)
  return () => {
    bus.off(ch, handler)
  }
}

export function subscribeProjectProgress(
  projectId: string,
  handler: (event: ProjectProgressEvent) => void,
): () => void {
  const ch = projectChannel(projectId)
  bus.on(ch, handler)
  return () => {
    bus.off(ch, handler)
  }
}

/**
 * Recent events for a document. Returns a snapshot of the in-memory
 * buffer; safe to call before subscribing so the caller can render
 * history first, then receive new events live.
 */
export function getRecentProgress(documentId: string): ProgressEvent[] {
  return buffers.get(documentId)?.slice() ?? []
}
