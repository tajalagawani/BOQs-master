/**
 * ui/Accordion — summary-page accordion variant.
 * NOTE: distinct from /components/Accordion.tsx (the masterplan editor's
 * version). This one supports stats badges, deferred render, and
 * description text — used on the summary page.
 *
 * Ported from roshn/src/components/ui/Accordion.tsx with brand chips
 * replaced by IOX zinc tones.
 */
"use client";

import { useState, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface AccordionStat {
  label: string;
  value: string | number;
  type?: "default" | "success" | "warning" | "error" | "info";
}

interface Props {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  stats?: AccordionStat[];
  badge?: string;
  badgeType?: "default" | "success" | "warning" | "error" | "info";
  deferRender?: boolean;
}

const statStyles = {
  default: "bg-zinc-100 text-zinc-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  error: "bg-rose-100 text-rose-700",
  info: "bg-blue-50 text-blue-700",
};

const badgeStyles = {
  default: "bg-zinc-500 text-white",
  success: "bg-emerald-600 text-white",
  warning: "bg-amber-500 text-white",
  error: "bg-rose-500 text-white",
  info: "bg-zinc-900 text-white",
};

export function Accordion({
  title,
  description,
  defaultOpen = true,
  children,
  className = "",
  stats = [],
  badge,
  badgeType = "default",
  deferRender = true,
}: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [hasBeenOpened, setHasBeenOpened] = useState(defaultOpen);
  const accordionRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    const willOpen = !isOpen;
    setIsOpen(willOpen);
    if (willOpen && !hasBeenOpened) setHasBeenOpened(true);
    if (willOpen) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          accordionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 200);
      });
    }
  };

  const shouldRender = !deferRender || hasBeenOpened;

  return (
    <div
      ref={accordionRef}
      className={cn(
        "border border-zinc-200 rounded-xl bg-white overflow-hidden scroll-mt-20",
        className,
      )}
    >
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-zinc-600 mt-1 pr-4 max-w-2xl">{description}</p>
          )}
          {!isOpen && stats.length > 0 && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {stats.map((stat, i) => (
                <div
                  key={i}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                    statStyles[stat.type || "default"],
                  )}
                >
                  <span className="opacity-70 font-normal">{stat.label}:</span>
                  <span>{stat.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          {badge && (
            <span
              className={cn(
                "text-[10px] font-medium px-2.5 py-1 rounded-full",
                badgeStyles[badgeType],
              )}
            >
              {badge}
            </span>
          )}
          <ChevronDown
            className={cn(
              "size-5 text-zinc-500 transition-transform duration-200",
              isOpen && "rotate-180",
            )}
            strokeWidth={1.75}
          />
        </div>
      </button>
      <div
        className={cn(
          "transition-all duration-200 ease-in-out",
          isOpen ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden",
        )}
      >
        {shouldRender && (
          <div className="p-4 pt-0 space-y-4">{children}</div>
        )}
      </div>
    </div>
  );
}

export default Accordion;
