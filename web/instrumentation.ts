/**
 * Next.js instrumentation hook — runs once per server process at startup.
 * Wires the runtime-error bus consumed by /platform/errors.
 *
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { installRuntimeHandlers } = await import("./lib/platform/error-bus");
    installRuntimeHandlers();
  }
}

/**
 * onRequestError fires for *any* uncaught error from a Server Component,
 * Server Action, Route Handler, or middleware. Required for catching
 * errors that happen during streaming RSC renders, which `try/catch`
 * around `await` can't reach.
 */
export async function onRequestError(
  err: Error,
  request: { path: string; method: string; headers: Record<string, string> },
  context: { routeKind: string; routePath: string; renderSource?: string },
) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { recordPlatformError } = await import("./lib/platform/error-bus");
  recordPlatformError({
    kind: context.routeKind === "app" ? "render" : "route",
    error: err,
    source: context.renderSource ?? context.routePath,
    path: request.path,
    meta: { method: request.method, routeKind: context.routeKind },
  });
}
