"use client";

import { cn } from "@/lib/cn";

interface Props {
  sheets: string[];
  current: string;
  onChange: (sheet: string) => void;
}

export function SheetTabs({ sheets, current, onChange }: Props) {
  return (
    <div className="bg-white border border-zinc-200 rounded-lg px-1 py-1 flex gap-0.5 overflow-x-auto">
      {sheets.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={cn(
            "h-6 px-2.5 rounded text-[11px] font-medium whitespace-nowrap transition-colors",
            current === s
              ? "bg-zinc-900 text-white"
              : "text-zinc-600 hover:bg-zinc-100",
          )}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
