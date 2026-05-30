/**
 * Accordion — ported from roshn/src/components/Accordion.tsx.
 * Same semantics: title + count chip + totalCost label + actionButton slot.
 */
"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { formatNumber } from "@/utils/formatters";
import { cn } from "@/lib/cn";

interface Props {
  title: string;
  count?: number;
  totalCost?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
  actionButton?: React.ReactNode;
}

export default function Accordion({
  title,
  count,
  totalCost,
  defaultOpen = false,
  children,
  actionButton,
}: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-zinc-200 rounded-xl bg-white mb-4">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-zinc-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <ChevronRight
            className={cn(
              "size-4 text-zinc-500 transition-transform",
              isOpen && "rotate-90",
            )}
            strokeWidth={1.75}
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-zinc-900 text-sm">{title}</h3>
              {count !== undefined && count > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 h-5 min-w-5 text-[10.5px] font-medium bg-zinc-900 text-white rounded-full">
                  {count}
                </span>
              )}
            </div>
            {totalCost !== undefined && (
              <p className="text-[11px] text-zinc-500">
                Total:{" "}
                <span className="font-medium text-zinc-700">
                  {formatNumber(totalCost)}
                </span>
              </p>
            )}
          </div>
        </div>
        {actionButton && (
          <div onClick={(e) => e.stopPropagation()}>{actionButton}</div>
        )}
      </div>

      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isOpen ? "max-h-[3000px] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="px-4 pb-4 border-t border-zinc-200">{children}</div>
      </div>
    </div>
  );
}
