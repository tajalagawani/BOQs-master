"use client";

import { Building2, Banknote, Layers, TrendingUp } from "lucide-react";
import { cn } from "@/modules/rates/lib/utils";

type Stat = {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "neutral";
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
};

export function StatCards({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="group relative overflow-hidden rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:-translate-y-px"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground font-medium">
                {s.label}
              </div>
              <div className="text-2xl font-semibold tabular-nums tracking-tight">
                {s.value}
              </div>
            </div>
            <div
              className={cn(
                "h-9 w-9 rounded-lg grid place-items-center shrink-0",
                s.accent
              )}
            >
              <s.icon className="h-4 w-4" />
            </div>
          </div>
          {s.delta && (
            <div className="mt-2 flex items-center gap-1 text-xs">
              <TrendingUp
                className={cn(
                  "h-3 w-3",
                  s.trend === "up"
                    ? "text-emerald-600"
                    : s.trend === "down"
                    ? "text-rose-600 rotate-180"
                    : "text-muted-foreground"
                )}
              />
              <span
                className={cn(
                  "font-medium tabular-nums",
                  s.trend === "up"
                    ? "text-emerald-600"
                    : s.trend === "down"
                    ? "text-rose-600"
                    : "text-muted-foreground"
                )}
              >
                {s.delta}
              </span>
              <span className="text-muted-foreground">vs last quarter</span>
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      ))}
    </div>
  );
}

export const DEFAULT_STATS: Stat[] = [
  {
    label: "Total Rates",
    value: "193,304",
    delta: "+8.2%",
    trend: "up",
    icon: Layers,
    accent: "bg-violet-500/10 text-violet-600",
  },
  {
    label: "Active Projects",
    value: "62",
    delta: "+4",
    trend: "up",
    icon: Building2,
    accent: "bg-sky-500/10 text-sky-600",
  },
  {
    label: "Avg. Unit Rate",
    value: "AED 487",
    delta: "+2.1%",
    trend: "up",
    icon: Banknote,
    accent: "bg-emerald-500/10 text-emerald-600",
  },
  {
    label: "Inflation Index",
    value: "104.7",
    delta: "−0.3%",
    trend: "down",
    icon: TrendingUp,
    accent: "bg-amber-500/10 text-amber-600",
  },
];
