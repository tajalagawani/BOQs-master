"use client";

/**
 * 10X Suite — pill tab group (Product Suite selector on the launcher).
 * Port of `.tabs`/`.tab` in 10x-suite-launcher.html. Interactive highlight only;
 * the launcher treats these as a category lens rather than a hard filter.
 */
import { cn } from "@/lib/cn";
import { ACCENT_DOT, type SuiteTabItem } from "./types";

export function SuiteTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: SuiteTabItem[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-white/10 bg-white/[0.07] p-[5px]">
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={cn(
              "inline-flex h-[34px] items-center gap-2 whitespace-nowrap rounded-full px-4 text-[13px] transition-colors",
              active
                ? "bg-white font-semibold text-suite-ink shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                : "font-medium text-[#c3ccdd] hover:text-white",
            )}
          >
            <span className={cn("size-[7px] rounded-full", ACCENT_DOT[t.dot])} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
