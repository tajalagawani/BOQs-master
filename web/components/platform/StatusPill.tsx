import { cn } from "@/lib/cn";
import { statusTone } from "@/lib/platform/kpi-types";
import type { MatrixStatus } from "@/lib/platform/matrix-types";

interface Props {
  status: MatrixStatus;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

export function StatusPill({ status, label, size = "sm", className }: Props) {
  const tone = statusTone(status);
  const sizeCls =
    size === "md"
      ? "h-7 px-2.5 text-[11.5px]"
      : "h-5.5 px-2 text-[10.5px]";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium ring-1",
        tone.bg,
        tone.text,
        tone.ring,
        sizeCls,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", tone.dot)} />
      {label ?? labelOf(status)}
    </span>
  );
}

function labelOf(s: MatrixStatus): string {
  return s === "green"
    ? "Met"
    : s === "yellow"
      ? "Substantively met"
      : s === "orange"
        ? "Weak"
        : s === "red"
          ? "Deferred"
          : "Unknown";
}
