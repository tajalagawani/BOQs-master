"use client";

import { useState } from "react";
import { HelpCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  title: string;
  explanation: string;
  formula?: string;
  benchmark?: string;
  defaultExpanded?: boolean;
  className?: string;
}

export function MetricExplainer({
  title,
  explanation,
  formula,
  benchmark,
  defaultExpanded = false,
  className = "",
}: Props) {
  const [open, setOpen] = useState(defaultExpanded);
  return (
    <div className={cn("border border-zinc-200 rounded-xl bg-zinc-50", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-zinc-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="size-4 text-zinc-400" strokeWidth={1.75} />
          <span className="text-sm font-medium text-zinc-700">{title}</span>
        </div>
        <ChevronDown
          className={cn("size-4 text-zinc-400 transition-transform", open && "rotate-180")}
          strokeWidth={1.75}
        />
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-xs text-zinc-600">{explanation}</p>
          {formula && (
            <div className="bg-white rounded p-2 border border-zinc-200">
              <p className="text-xs text-zinc-500 mb-1">Formula:</p>
              <code className="text-xs font-mono text-zinc-800">{formula}</code>
            </div>
          )}
          {benchmark && (
            <div className="bg-blue-50 rounded p-2 border border-blue-100">
              <p className="text-xs text-blue-700">
                <span className="font-medium">Benchmark:</span> {benchmark}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MetricExplainer;
