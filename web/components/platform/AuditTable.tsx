"use client";

import { useMemo, useState } from "react";
import { Search, X, Filter } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AuditEvent, AuditModule } from "@/lib/platform/audit";

interface Props {
  events: AuditEvent[];
}

export function AuditTable({ events }: Props) {
  const [query, setQuery] = useState("");
  const [module, setModule] = useState<AuditModule | "all">("all");
  const [actor, setActor] = useState("all");

  const actors = useMemo(() => {
    const s = new Set(events.map((e) => e.actor));
    return ["all", ...[...s].sort()];
  }, [events]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (module !== "all" && e.module !== module) return false;
      if (actor !== "all" && e.actor !== actor) return false;
      if (!q) return true;
      return (
        e.action.toLowerCase().includes(q) ||
        e.actor.toLowerCase().includes(q) ||
        e.target.toLowerCase().includes(q) ||
        (e.targetId ?? "").toLowerCase().includes(q) ||
        (e.payloadSummary ?? "").toLowerCase().includes(q)
      );
    });
  }, [events, module, actor, query]);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-zinc-200 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="size-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2"
            strokeWidth={1.75}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search action, actor, target, payload…"
            className="w-full h-9 pl-9 pr-9 text-[12.5px] bg-zinc-50 border border-zinc-200 rounded-md placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 size-5 inline-flex items-center justify-center text-zinc-400 hover:text-zinc-700"
            >
              <X className="size-3.5" strokeWidth={2} />
            </button>
          )}
        </div>

        <div className="inline-flex items-center gap-0.5 bg-zinc-100 rounded-md p-0.5">
          {(["all", "IOX", "ProcureX"] as const).map((m) => {
            const active = module === m;
            return (
              <button
                key={m}
                onClick={() => setModule(m)}
                className={cn(
                  "h-7 px-2.5 text-[11.5px] font-medium rounded transition-colors",
                  active ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900",
                )}
              >
                {m === "all" ? "Both modules" : m}
              </button>
            );
          })}
        </div>

        <div className="inline-flex items-center gap-1.5">
          <Filter className="size-3 text-zinc-500" strokeWidth={1.75} />
          <select
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            className="h-7 px-2 text-[11.5px] bg-zinc-100 rounded-md border-0 focus:ring-2 focus:ring-zinc-900/10 max-w-[180px]"
          >
            {actors.map((a) => (
              <option key={a} value={a}>
                {a === "all" ? "All actors" : a}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto text-[11.5px] text-zinc-500 tabular-nums">
          {filtered.length} of {events.length}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-zinc-200 rounded-2xl px-6 py-12 text-center text-[12px] text-zinc-500">
          {events.length === 0
            ? "No activity yet — events appear here as soon as users start interacting with IOX modules."
            : "No events match these filters."}
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <table className="w-full text-[12.5px]">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 text-[11px] uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 text-left font-medium">When</th>
                <th className="px-3 py-2 text-left font-medium">Module</th>
                <th className="px-3 py-2 text-left font-medium">Actor</th>
                <th className="px-3 py-2 text-left font-medium">Action</th>
                <th className="px-3 py-2 text-left font-medium">Target</th>
                <th className="px-3 py-2 text-left font-medium">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((e) => (
                <tr key={`${e.module}-${e.id}`} className="hover:bg-zinc-50/60">
                  <td className="px-3 py-2 whitespace-nowrap text-zinc-600 text-[11.5px] tabular-nums">
                    {formatRelative(e.ts)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <ModuleBadge module={e.module} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-zinc-800">{e.actor}</td>
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-[11.5px] text-zinc-900">
                    {e.action}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-zinc-600 text-[11.5px]">
                    <span className="font-mono">{e.target}</span>
                    {e.targetId && (
                      <span className="text-zinc-400">{` · ${e.targetId.slice(0, 8)}`}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 max-w-[320px]">
                    <div
                      className="text-zinc-600 text-[11px] font-mono truncate"
                      title={e.payloadSummary}
                    >
                      {e.payloadSummary ?? <span className="text-zinc-400">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ModuleBadge({ module }: { module: AuditModule }) {
  const tone =
    module === "IOX"
      ? "bg-violet-50 ring-violet-200 text-violet-700"
      : "bg-sky-50 ring-sky-200 text-sky-700";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 h-5 text-[10.5px] font-medium ring-1",
        tone,
      )}
    >
      {module}
    </span>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return new Date(iso).toLocaleDateString();
}
