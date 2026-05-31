import { cn } from "@/lib/cn";

interface Props {
  green: number;
  yellow: number;
  orange: number;
  red: number;
  className?: string;
}

/**
 * Single-row stacked bar showing the 4-bucket KPI mix.
 */
export function KpiBar({ green, yellow, orange, red, className }: Props) {
  const total = Math.max(1, green + yellow + orange + red);
  const seg = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex h-2 rounded-full overflow-hidden bg-zinc-100">
        <div className="bg-emerald-500" style={{ width: seg(green) }} />
        <div className="bg-amber-400"   style={{ width: seg(yellow) }} />
        <div className="bg-orange-500"  style={{ width: seg(orange) }} />
        <div className="bg-rose-500"    style={{ width: seg(red) }} />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-600">
        <Legend dotClass="bg-emerald-500" label="Strong/Done" value={green} />
        <Legend dotClass="bg-amber-400"   label="Partial"     value={yellow} />
        <Legend dotClass="bg-orange-500"  label="Weak"        value={orange} />
        <Legend dotClass="bg-rose-500"    label="Not started" value={red} />
      </div>
    </div>
  );
}

function Legend({ dotClass, label, value }: { dotClass: string; label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2 rounded-full", dotClass)} />
      <span className="text-zinc-500">{label}</span>
      <span className="tabular-nums font-medium text-zinc-900">{value}</span>
    </span>
  );
}
