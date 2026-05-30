"use client";

import { Info, CheckCircle2, AlertTriangle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/cn";

type InsightType = "info" | "success" | "warning" | "tip";

interface Props {
  type: InsightType;
  title: string;
  description: string;
  icon?: React.ReactNode;
  className?: string;
}

const typeStyles: Record<InsightType, { bg: string; border: string; icon: string; title: string }> = {
  info: { bg: "bg-blue-50", border: "border-blue-200", icon: "text-blue-600", title: "text-blue-900" },
  success: { bg: "bg-emerald-50", border: "border-emerald-200", icon: "text-emerald-600", title: "text-emerald-900" },
  warning: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-600", title: "text-amber-900" },
  tip: { bg: "bg-violet-50", border: "border-violet-200", icon: "text-violet-600", title: "text-violet-900" },
};

const defaultIcons: Record<InsightType, React.ReactNode> = {
  info: <Info className="size-4" strokeWidth={1.75} />,
  success: <CheckCircle2 className="size-4" strokeWidth={1.75} />,
  warning: <AlertTriangle className="size-4" strokeWidth={1.75} />,
  tip: <Lightbulb className="size-4" strokeWidth={1.75} />,
};

export function InsightCard({
  type,
  title,
  description,
  icon,
  className = "",
}: Props) {
  const s = typeStyles[type];
  return (
    <div className={cn("rounded-xl border p-3", s.bg, s.border, className)}>
      <div className="flex gap-3">
        <div className={cn("shrink-0 mt-0.5", s.icon)}>{icon || defaultIcons[type]}</div>
        <div className="min-w-0">
          <h4 className={cn("text-sm font-medium", s.title)}>{title}</h4>
          <p className="mt-1 text-xs text-zinc-600">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default InsightCard;
