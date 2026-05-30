"use client";

import { cn } from "@/lib/cn";

interface Props {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function SectionHeader({
  title,
  description,
  icon,
  action,
  className = "",
}: Props) {
  return (
    <div className={cn("mb-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-zinc-400">{icon}</span>}
          <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
            {title}
          </h2>
        </div>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="text-xs text-zinc-900 hover:text-zinc-600 font-medium"
          >
            {action.label}
          </button>
        )}
      </div>
      {description && (
        <p className="mt-2 text-sm text-zinc-600 max-w-3xl">{description}</p>
      )}
    </div>
  );
}

export default SectionHeader;
