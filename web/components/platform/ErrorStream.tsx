"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Bug,
  ChevronRight,
  CircleDot,
  Pause,
  Play,
  Plug,
  PlugZap,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface RuntimeError {
  id: string;
  ts: string;
  kind: "uncaught" | "unhandled" | "route" | "integration" | "render" | "log";
  message: string;
  stack?: string;
  source?: string;
  path?: string;
  meta?: Record<string, unknown>;
}

interface Props {
  initial: RuntimeError[];
}

type ConnectionState = "connecting" | "open" | "closed" | "error";

const KIND_TONES: Record<RuntimeError["kind"], string> = {
  uncaught: "bg-suite-dang-bg ring-suite-dang/20 text-suite-dang",
  unhandled: "bg-suite-dang-bg ring-suite-dang/20 text-suite-dang",
  render: "bg-suite-warn-bg ring-suite-warn/20 text-suite-warn",
  route: "bg-suite-warn-bg ring-suite-warn/20 text-suite-warn",
  integration: "bg-suite-blue-soft ring-suite-blue/20 text-suite-blue",
  log: "bg-suite-neut-bg ring-suite-line text-suite-neut",
};

const KIND_ICONS: Record<RuntimeError["kind"], React.ReactNode> = {
  uncaught: <AlertOctagon className="size-2.5" strokeWidth={2} />,
  unhandled: <AlertOctagon className="size-2.5" strokeWidth={2} />,
  render: <Bug className="size-2.5" strokeWidth={2} />,
  route: <AlertTriangle className="size-2.5" strokeWidth={2} />,
  integration: <AlertTriangle className="size-2.5" strokeWidth={2} />,
  log: <CircleDot className="size-2.5" strokeWidth={2} />,
};

const FILTERS: { value: RuntimeError["kind"] | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "uncaught", label: "Uncaught" },
  { value: "unhandled", label: "Unhandled" },
  { value: "render", label: "Render" },
  { value: "route", label: "Route" },
  { value: "integration", label: "Integration" },
  { value: "log", label: "Log" },
];

export function ErrorStream({ initial }: Props) {
  const [errors, setErrors] = useState<RuntimeError[]>(initial);
  const [conn, setConn] = useState<ConnectionState>("connecting");
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<RuntimeError["kind"] | "all">("all");
  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const pausedRef = useRef(paused);
  const seenIds = useRef(new Set<string>(initial.map((e) => e.id)));

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    let cancelled = false;
    const source = new EventSource("/api/platform/errors/stream");

    source.addEventListener("hello", () => {
      if (!cancelled) setConn("open");
    });
    source.addEventListener("error", (raw) => {
      const ev = raw as MessageEvent<string>;
      if (cancelled) return;
      if (!ev.data) {
        setConn(source.readyState === EventSource.OPEN ? "open" : "error");
        return;
      }
      try {
        const e = JSON.parse(ev.data) as RuntimeError;
        if (seenIds.current.has(e.id)) return;
        seenIds.current.add(e.id);
        if (pausedRef.current) return;
        setErrors((prev) => [e, ...prev].slice(0, 500));
      } catch {
        /* ignore */
      }
    });
    source.onerror = () => {
      if (!cancelled) setConn("error");
    };
    source.onopen = () => {
      if (!cancelled) setConn("open");
    };

    return () => {
      cancelled = true;
      source.close();
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return errors.filter((e) => {
      if (filter !== "all" && e.kind !== filter) return false;
      if (!q) return true;
      return (
        e.message.toLowerCase().includes(q) ||
        (e.source ?? "").toLowerCase().includes(q) ||
        (e.path ?? "").toLowerCase().includes(q)
      );
    });
  }, [errors, filter, query]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: errors.length };
    for (const e of errors) c[e.kind] = (c[e.kind] ?? 0) + 1;
    return c;
  }, [errors]);

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {/* Status + controls */}
      <div className="bg-white border border-suite-line rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3">
        <ConnectionBadge state={conn} />

        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="size-3.5 text-suite-ink-4 absolute left-3 top-1/2 -translate-y-1/2"
            strokeWidth={1.75}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by message, source, path…"
            className="w-full h-9 pl-9 pr-9 text-[12.5px] bg-suite-card-soft border border-suite-line rounded-md placeholder:text-suite-ink-4 focus:outline-none focus:ring-2 focus:ring-suite-ink/10 focus:border-suite-line-2"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 size-5 inline-flex items-center justify-center text-suite-ink-4 hover:text-suite-ink-2"
            >
              <X className="size-3.5" strokeWidth={2} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className={cn(
            "h-8 px-3 inline-flex items-center gap-1.5 rounded-full text-[11.5px] font-medium ring-1 transition-colors",
            paused
              ? "bg-suite-warn-bg ring-suite-warn/30 text-suite-warn hover:bg-suite-warn-bg/70"
              : "bg-white ring-suite-line text-suite-ink-2 hover:bg-suite-card-soft",
          )}
        >
          {paused ? <Play className="size-3" strokeWidth={2} /> : <Pause className="size-3" strokeWidth={2} />}
          {paused ? "Resume" : "Pause"}
        </button>

        <button
          type="button"
          onClick={() => {
            setErrors([]);
            setOpenIds(new Set());
          }}
          className="h-8 px-3 inline-flex items-center gap-1.5 rounded-full ring-1 ring-suite-line bg-white text-[11.5px] font-medium text-suite-ink-2 hover:bg-suite-card-soft"
        >
          <Trash2 className="size-3" strokeWidth={2} />
          Clear
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-1 flex-wrap">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          const n = counts[f.value] ?? 0;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "h-7 px-2.5 inline-flex items-center gap-1.5 rounded-full text-[11.5px] font-medium ring-1 transition-colors",
                active
                  ? "bg-suite-navy text-white ring-suite-navy"
                  : "bg-white text-suite-ink-3 ring-suite-line hover:text-suite-ink hover:ring-suite-line-2",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "tabular-nums text-[10.5px]",
                  active ? "text-suite-ink-4" : "text-suite-ink-4",
                )}
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>

      {/* Stream */}
      {filtered.length === 0 ? (
        <EmptyState totalCount={errors.length} />
      ) : (
        <ol className="bg-white border border-suite-line rounded-2xl divide-y divide-suite-line-soft overflow-hidden">
          {filtered.map((e) => {
            const open = openIds.has(e.id);
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => toggle(e.id)}
                  className="w-full px-4 py-3 flex items-start gap-3 hover:bg-suite-card-soft/60 text-left transition-colors"
                >
                  <KindBadge kind={e.kind} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-medium text-suite-ink break-words line-clamp-2 font-mono leading-snug">
                      {e.message}
                    </div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap text-[10.5px] text-suite-ink-3">
                      {e.source && (
                        <code className="bg-suite-card-soft rounded px-1.5 py-0.5">{e.source}</code>
                      )}
                      {e.path && (
                        <code className="bg-suite-card-soft rounded px-1.5 py-0.5">{e.path}</code>
                      )}
                      <time className="ml-auto tabular-nums">{formatTs(e.ts)}</time>
                    </div>
                  </div>
                  <ChevronRight
                    className={cn(
                      "size-3.5 text-suite-ink-4 mt-1 shrink-0 transition-transform",
                      open && "rotate-90",
                    )}
                    strokeWidth={2}
                  />
                </button>
                {open && (
                  <div className="px-4 pb-4 bg-suite-card-soft/40 border-t border-suite-line-soft space-y-3">
                    {e.stack && (
                      <pre className="mt-3 bg-suite-navy-deep text-zinc-100 text-[11px] font-mono px-3 py-2.5 rounded-md overflow-x-auto leading-relaxed whitespace-pre">
                        {e.stack}
                      </pre>
                    )}
                    {e.meta && (
                      <pre className="bg-white border border-suite-line text-[11px] font-mono px-3 py-2 rounded-md overflow-x-auto">
                        {JSON.stringify(e.meta, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function ConnectionBadge({ state }: { state: ConnectionState }) {
  if (state === "open") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-suite-good bg-suite-good-bg ring-1 ring-suite-good/20 rounded-full px-2.5 h-7">
        <PlugZap className="size-3" strokeWidth={2} />
        <span className="relative inline-flex size-1.5">
          <span className="absolute inset-0 rounded-full bg-suite-good animate-ping opacity-60" />
          <span className="relative size-1.5 rounded-full bg-suite-good" />
        </span>
        Live
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-suite-dang bg-suite-dang-bg ring-1 ring-suite-dang/20 rounded-full px-2.5 h-7">
        <Plug className="size-3" strokeWidth={2} />
        Reconnecting…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-suite-neut bg-suite-neut-bg ring-1 ring-suite-line rounded-full px-2.5 h-7">
      <Plug className="size-3" strokeWidth={2} />
      Connecting…
    </span>
  );
}

function KindBadge({ kind }: { kind: RuntimeError["kind"] }) {
  return (
    <span
      className={cn(
        "size-7 rounded-full ring-1 inline-flex items-center justify-center shrink-0 mt-0.5",
        KIND_TONES[kind],
      )}
      title={kind}
    >
      {KIND_ICONS[kind]}
    </span>
  );
}

function EmptyState({ totalCount }: { totalCount: number }) {
  return (
    <div className="bg-white border border-dashed border-suite-line rounded-2xl px-6 py-12 text-center">
      <div className="size-10 mx-auto rounded-xl bg-suite-good-bg text-suite-good inline-flex items-center justify-center ring-1 ring-suite-good/20">
        <CircleDot className="size-4" strokeWidth={1.75} />
      </div>
      <h3 className="mt-3 text-[13px] font-semibold text-suite-ink">
        {totalCount === 0 ? "No errors yet" : "No errors match the current filter"}
      </h3>
      <p className="mt-1 text-[11.5px] text-suite-ink-3">
        {totalCount === 0
          ? "The server has been quiet since startup. New errors appear here in real time."
          : "Try clearing the search or switching the kind filter to All."}
      </p>
    </div>
  );
}

function formatTs(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
