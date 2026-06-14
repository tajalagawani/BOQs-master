"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, CircleDashed, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/cn";
import type { TestSuite } from "@/lib/platform/junit";

interface Props {
  suites: TestSuite[];
}

export function TestSuiteList({ suites }: Props) {
  const initial = new Set<string>();
  for (const s of suites) if (s.failures + s.errors > 0) initial.add(s.name);
  const [open, setOpen] = useState<Set<string>>(initial);

  function toggle(name: string) {
    const next = new Set(open);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setOpen(next);
  }

  return (
    <ol className="bg-white border border-suite-line rounded-2xl divide-y divide-suite-line-soft overflow-hidden">
      {suites.map((s) => {
        const isOpen = open.has(s.name);
        const failed = s.failures + s.errors;
        const passed = Math.max(0, s.tests - failed - s.skipped);
        return (
          <li key={s.name}>
            <button
              type="button"
              onClick={() => toggle(s.name)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-suite-card-soft text-left transition-colors"
            >
              <span
                className={cn(
                  "size-7 rounded-full ring-1 inline-flex items-center justify-center shrink-0",
                  failed > 0
                    ? "bg-suite-dang-bg ring-suite-dang-bg text-suite-dang"
                    : "bg-suite-good-bg ring-suite-good-bg text-suite-good",
                )}
              >
                {failed > 0 ? (
                  <XCircle className="size-3.5" strokeWidth={2} />
                ) : (
                  <CheckCircle2 className="size-3.5" strokeWidth={2} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-semibold text-suite-ink font-mono truncate">
                  {s.name}
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-[11px] text-suite-ink-3">
                  <span className="text-suite-good suite-num">{passed} passed</span>
                  {failed > 0 && (
                    <span className="text-suite-dang suite-num">{failed} failed</span>
                  )}
                  {s.skipped > 0 && (
                    <span className="suite-num">{s.skipped} skipped</span>
                  )}
                  <span className="inline-flex items-center gap-1 suite-num ml-auto">
                    <Clock className="size-2.5" strokeWidth={2} />
                    {s.durationSec.toFixed(2)}s
                  </span>
                </div>
              </div>
              <ChevronRight
                className={cn(
                  "size-3.5 text-suite-ink-4 shrink-0 transition-transform",
                  isOpen && "rotate-90",
                )}
                strokeWidth={2}
              />
            </button>
            {isOpen && (
              <div className="px-4 pb-3 bg-suite-card-soft border-t border-suite-line-soft">
                <ol className="pt-2 space-y-0.5">
                  {s.cases.map((c, i) => (
                    <li
                      key={i}
                      className={cn(
                        "flex items-start gap-2.5 py-1.5 px-2 rounded text-[12px]",
                        c.status === "failed" && "bg-suite-dang-bg",
                      )}
                    >
                      {c.status === "passed" ? (
                        <CheckCircle2
                          className="size-3 text-suite-good shrink-0 mt-0.5"
                          strokeWidth={2}
                        />
                      ) : c.status === "failed" ? (
                        <XCircle
                          className="size-3 text-suite-dang shrink-0 mt-0.5"
                          strokeWidth={2}
                        />
                      ) : (
                        <CircleDashed
                          className="size-3 text-suite-ink-4 shrink-0 mt-0.5"
                          strokeWidth={2}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div
                          className={cn(
                            "truncate",
                            c.status === "failed" ? "text-suite-dang font-medium" : "text-suite-ink-2",
                          )}
                        >
                          {c.name}
                        </div>
                        {c.failure && (
                          <pre className="mt-1 bg-suite-dang-bg border border-suite-line text-[10.5px] font-mono px-2 py-1.5 rounded overflow-x-auto whitespace-pre-wrap break-all">
                            {c.failure.message}
                            {c.failure.detail && c.failure.detail !== c.failure.message ? `\n${c.failure.detail.slice(0, 600)}` : ""}
                          </pre>
                        )}
                      </div>
                      <span className="text-[10.5px] text-suite-ink-4 suite-num shrink-0">
                        {c.durationSec.toFixed(2)}s
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
