"use client";

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/modules/rates/components/ui/tooltip";
import { Badge } from "@/modules/rates/components/ui/badge";
import type { Column } from "@/modules/rates/lib/schemas";
import { cn, formatNumber } from "@/modules/rates/lib/utils";

type Props = {
  column: Column;
  value: unknown;
};

const SECTION_ACCENTS: Array<[RegExp, string]> = [
  [/electrical/i, "bg-amber-500"],
  [/mechanical/i, "bg-sky-500"],
  [/concrete/i, "bg-slate-500"],
  [/finishes/i, "bg-violet-500"],
  [/wood/i, "bg-orange-500"],
  [/metal/i, "bg-zinc-500"],
  [/site|earth/i, "bg-emerald-500"],
  [/roads|paving/i, "bg-amber-700"],
  [/landscape|park/i, "bg-lime-500"],
  [/marine|water/i, "bg-blue-500"],
  [/preliminari/i, "bg-rose-500"],
  [/mep|hvac|electrical/i, "bg-fuchsia-500"],
];

function sectionAccent(value: string): string {
  for (const [re, cls] of SECTION_ACCENTS) {
    if (re.test(value)) return cls;
  }
  return "bg-muted-foreground/40";
}

function statusVariant(s: string): "success" | "warning" | "outline" {
  const k = s.toLowerCase();
  if (k.includes("award")) return "success";
  if (k.includes("tender")) return "warning";
  return "outline";
}

function statusDot(s: string): string {
  const k = s.toLowerCase();
  if (k.includes("award")) return "bg-emerald-500";
  if (k.includes("tender")) return "bg-amber-500";
  return "bg-muted-foreground/40";
}

export function TypedCell({ column, value }: Props) {
  const empty = value == null || value === "";

  // Build inner content + a title string for tooltip-on-overflow.
  let inner: React.ReactNode = null;
  let titleText: string | undefined = undefined;
  let extraTd = "";

  switch (column.type) {
    case "status": {
      if (empty) {
        inner = <Muted />;
        break;
      }
      const s = String(value);
      inner = (
        <Badge variant={statusVariant(s)} className="font-normal">
          <span
            className={cn("h-1.5 w-1.5 rounded-full mr-1.5", statusDot(s))}
          />
          {s}
        </Badge>
      );
      break;
    }

    case "section": {
      if (empty) {
        inner = <Muted />;
        break;
      }
      const s = String(value);
      titleText = s;
      inner = (
        <span className="flex items-center gap-1.5 min-w-0">
          <span
            className={cn("h-1.5 w-1.5 rounded-full shrink-0", sectionAccent(s))}
          />
          <span className="truncate">{s}</span>
        </span>
      );
      break;
    }

    case "description": {
      if (empty) {
        inner = <Muted />;
        break;
      }
      titleText = String(value);
      inner = String(value);
      break;
    }

    case "money": {
      const n = toNumber(value);
      inner = n == null ? <Muted /> : formatNumber(n);
      extraTd = "tabular-nums font-medium";
      break;
    }

    case "number": {
      const n = toNumber(value);
      inner = n == null ? <Muted /> : formatNumber(n);
      extraTd = "tabular-nums";
      break;
    }

    case "ratio": {
      const n = toNumber(value);
      if (n == null) {
        inner = <Muted />;
      } else {
        const isPercent = Math.abs(n) > 5;
        inner = isPercent
          ? `${formatNumber(n, { maximumFractionDigits: 1 })}%`
          : formatNumber(n, { maximumFractionDigits: 3 });
      }
      extraTd = "tabular-nums text-muted-foreground";
      break;
    }

    case "year": {
      if (empty) {
        inner = <Muted />;
      } else {
        inner = String(value);
      }
      extraTd = "tabular-nums";
      break;
    }

    case "currency": {
      inner = empty ? <Muted /> : (
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">
          {String(value)}
        </span>
      );
      break;
    }

    case "unit": {
      inner = empty ? <Muted /> : (
        <span className="text-muted-foreground">{String(value)}</span>
      );
      break;
    }

    case "text":
    default: {
      if (empty) {
        inner = <Muted />;
      } else {
        const s = String(value);
        titleText = s;
        inner = s;
      }
    }
  }

  const align = column.align === "right" ? "text-right" : "text-left";
  return (
    <td
      className={cn("border-b px-2 overflow-hidden", align, extraTd)}
      style={{ height: 32 }}
    >
      <OverflowTooltip fullText={titleText}>{inner}</OverflowTooltip>
    </td>
  );
}

function Muted() {
  return <span className="text-muted-foreground/40">—</span>;
}

function toNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function OverflowTooltip({
  children,
  fullText,
}: {
  children?: React.ReactNode;
  fullText?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = React.useState(false);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const next = el.scrollWidth - 1 > el.clientWidth;
    if (next !== overflow) setOverflow(next);
  });

  const wrap = (
    <div ref={ref} className="truncate">
      {children}
    </div>
  );

  if (!overflow || !fullText) return wrap;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{wrap}</TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="start"
        className="max-w-md break-words whitespace-normal leading-snug"
      >
        {fullText}
      </TooltipContent>
    </Tooltip>
  );
}
