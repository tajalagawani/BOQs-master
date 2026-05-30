"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";

type Status = "running" | "complete" | "failed";

export function LiveLog({ runId }: { runId: string }) {
  const router = useRouter();
  const [lines, setLines] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("running");
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource(`/api/run/${runId}/log`);
    es.addEventListener("log", (e) => {
      const msg = (e as MessageEvent).data as string;
      if (msg === "") return;
      setLines((prev) => [...prev, msg]);
    });
    es.addEventListener("status", (e) => {
      try {
        const j = JSON.parse((e as MessageEvent).data) as { status: Status };
        setStatus(j.status);
      } catch {
        /* ignore */
      }
    });
    es.addEventListener("done", (e) => {
      try {
        const j = JSON.parse((e as MessageEvent).data) as { status: Status };
        setStatus(j.status);
      } catch {
        /* ignore */
      }
      es.close();
    });
    es.onerror = () => {
      es.close();
    };
    return () => es.close();
  }, [runId]);

  // Auto-scroll to bottom
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  // Project id == run id (set in /api/upload). Land on the workspace.
  const goToResult = () => router.push(`/boqs/${runId}`);

  return (
    <div className="flex flex-col h-full gap-3 min-h-0">
      {/* Status bar */}
      <div className="flex items-center justify-between bg-white border border-zinc-200 rounded-xl px-5 py-3">
        <div className="flex items-center gap-3">
          {status === "running" && (
            <>
              <Loader2 className="size-5 text-zinc-700 animate-spin" />
              <span className="font-medium text-zinc-900">Processing…</span>
              <span className="text-sm text-zinc-500">
                {lines.length} log line{lines.length === 1 ? "" : "s"}
              </span>
            </>
          )}
          {status === "complete" && (
            <>
              <div className="size-7 rounded-full bg-emerald-100 text-emerald-700 inline-flex items-center justify-center">
                <Check className="size-4" strokeWidth={2.5} />
              </div>
              <span className="font-medium text-zinc-900">Complete</span>
            </>
          )}
          {status === "failed" && (
            <>
              <div className="size-7 rounded-full bg-rose-100 text-rose-700 inline-flex items-center justify-center">
                <AlertTriangle className="size-4" strokeWidth={2.5} />
              </div>
              <span className="font-medium text-zinc-900">Failed</span>
            </>
          )}
        </div>
        {status === "complete" && (
          <button
            type="button"
            onClick={goToResult}
            className="h-9 px-4 rounded-lg text-sm font-medium bg-zinc-900 text-white hover:bg-zinc-800"
          >
            Open project →
          </button>
        )}
      </div>

      {/* Log */}
      <div
        ref={scrollerRef}
        className={cn(
          "flex-1 min-h-0 bg-zinc-950 text-zinc-100 rounded-xl p-4 overflow-y-auto",
          "font-mono text-[12px] leading-relaxed",
        )}
      >
        {lines.length === 0 ? (
          <div className="text-zinc-500">Waiting for engine output…</div>
        ) : (
          lines.map((l, i) => <div key={i}>{l || " "}</div>)
        )}
      </div>
    </div>
  );
}
