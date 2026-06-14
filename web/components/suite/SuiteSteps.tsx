"use client";

/**
 * 10X Suite — step wizard (the `.steps` pill row in procurex-step3-10x-style.html).
 * Sits inside a navy hero. `current` is the 0-based index of the active step;
 * earlier steps render as done (check), later as upcoming.
 */
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export function SuiteSteps({
  steps,
  current,
  onSelect,
}: {
  steps: string[];
  current: number;
  /** Optional click handler (e.g. navigate to a completed step). */
  onSelect?: (index: number) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto rounded-full border border-white/10 bg-white/[0.06] p-[5px]">
      {steps.map((label, i) => {
        const done = i < current;
        const on = i === current;
        const Tag = onSelect ? "button" : "div";
        return (
          <Tag
            key={label}
            {...(onSelect ? { type: "button", onClick: () => onSelect(i) } : {})}
            className={cn(
              "flex h-[38px] items-center gap-2 whitespace-nowrap rounded-full px-[15px] text-[12.5px] font-medium",
              on
                ? "bg-white font-semibold text-suite-ink shadow-[0_3px_10px_rgba(0,0,0,0.18)]"
                : done
                  ? "text-[#cdd6e6]"
                  : "text-[#aeb8cc]",
            )}
          >
            <span
              className={cn(
                "grid size-5 place-items-center rounded-full text-[11px] font-semibold",
                on
                  ? "bg-suite-blue text-white"
                  : done
                    ? "bg-[#33507e] text-[#cdd9ef]"
                    : "border-[1.5px] border-white/25 text-[#aeb8cc]",
              )}
            >
              {done ? <Check className="size-3" strokeWidth={3} /> : i + 1}
            </span>
            {label}
          </Tag>
        );
      })}
    </div>
  );
}
