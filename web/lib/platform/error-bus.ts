import "server-only";

import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";

/**
 * In-memory runtime-error ring buffer + fan-out for the /platform/errors
 * live stream. Single process = single buffer (pm2 runs one Node instance
 * per app). Survives request boundaries; resets on process restart.
 *
 * Producers: `instrumentation.ts` hooks, the lib/platform integrations'
 * catch blocks, and any code that calls `recordPlatformError`.
 *
 * Consumers: the SSE route `app/api/platform/errors/stream/route.ts`.
 */

export type ErrorKind =
  | "uncaught"
  | "unhandled"
  | "route"
  | "integration"
  | "render"
  | "log";

export interface RuntimeError {
  id: string;
  ts: string;
  kind: ErrorKind;
  message: string;
  stack?: string;
  source?: string;
  path?: string;
  meta?: Record<string, unknown>;
}

const BUFFER_MAX = 500;

interface Bus {
  buffer: RuntimeError[];
  emitter: EventEmitter;
  installed: boolean;
}

// Stash on globalThis so a single instance survives Next.js HMR + module
// re-evaluation across the dev server's worker boundaries.
const g = globalThis as unknown as { __ioxErrorBus?: Bus };
if (!g.__ioxErrorBus) {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(50);
  g.__ioxErrorBus = { buffer: [], emitter, installed: false };
}
const bus = g.__ioxErrorBus;

export function recordPlatformError(
  input: Partial<RuntimeError> & { message?: string; stack?: string; error?: unknown },
): RuntimeError {
  const err = input.error;
  const message =
    input.message ??
    (err instanceof Error ? err.message : String(err ?? "Unknown error"));
  const stack =
    input.stack ?? (err instanceof Error ? err.stack ?? undefined : undefined);
  const entry: RuntimeError = {
    id: randomUUID(),
    ts: new Date().toISOString(),
    kind: input.kind ?? "log",
    message,
    stack,
    source: input.source,
    path: input.path,
    meta: input.meta,
  };
  bus.buffer.push(entry);
  if (bus.buffer.length > BUFFER_MAX) bus.buffer.splice(0, bus.buffer.length - BUFFER_MAX);
  bus.emitter.emit("error", entry);
  return entry;
}

export function getRecentErrors(limit = 100): RuntimeError[] {
  const slice = bus.buffer.slice(-limit);
  return slice.reverse();
}

export function subscribeToErrors(listener: (e: RuntimeError) => void): () => void {
  bus.emitter.on("error", listener);
  return () => bus.emitter.off("error", listener);
}

/**
 * One-time wiring of process-level handlers. Called by instrumentation.ts.
 * Safe to call multiple times — guarded by `installed`.
 */
export function installRuntimeHandlers() {
  if (bus.installed) return;
  bus.installed = true;

  process.on("uncaughtException", (err) => {
    recordPlatformError({
      kind: "uncaught",
      error: err,
      source: "process.uncaughtException",
    });
  });

  process.on("unhandledRejection", (reason) => {
    recordPlatformError({
      kind: "unhandled",
      error: reason as unknown,
      source: "process.unhandledRejection",
    });
  });

  // Patch console.error so all server-side error logs flow into the bus.
  // We keep the original behaviour (stderr still receives the log).
  const originalConsoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    try {
      // Skip if this call originated from recordPlatformError to avoid loops
      const first = args[0];
      const message =
        typeof first === "string"
          ? args.map(stringifyArg).join(" ")
          : stringifyArg(first);
      // Heuristic: a record from us already produced one bus entry; the
      // console.error call comes later. Filter our own marker prefix to
      // avoid duplicating.
      if (!message.startsWith("[platform/error-bus]")) {
        // Pull a hint of which subsystem from the bracketed prefix.
        const prefixMatch = /^\[([^\]]+)\]/.exec(message);
        recordPlatformError({
          kind: "log",
          message,
          source: prefixMatch?.[1],
        });
      }
    } catch {
      /* never let our patch break logging */
    }
    originalConsoleError(...args);
  };
}
