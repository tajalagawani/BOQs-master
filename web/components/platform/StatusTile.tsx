import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  href?: string;
  external?: boolean;
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  accent?: "zinc" | "emerald" | "amber" | "rose" | "sky" | "violet";
  rightSlot?: React.ReactNode;
}

const ACCENTS = {
  zinc:    { ring: "ring-suite-navy",     tile: "bg-suite-navy text-white",         text: "text-suite-ink" },
  emerald: { ring: "ring-suite-good-bg",  tile: "bg-suite-good-bg text-suite-good", text: "text-suite-good" },
  amber:   { ring: "ring-suite-warn-bg",  tile: "bg-suite-warn-bg text-suite-warn", text: "text-suite-warn" },
  rose:    { ring: "ring-suite-dang-bg",  tile: "bg-suite-dang-bg text-suite-dang", text: "text-suite-dang" },
  sky:     { ring: "ring-suite-blue-soft", tile: "bg-suite-blue-soft text-suite-blue", text: "text-suite-blue" },
  violet:  { ring: "ring-suite-neut-bg",  tile: "bg-suite-neut-bg text-suite-neut", text: "text-suite-neut" },
};

export function StatusTile({
  href,
  external,
  label,
  value,
  hint,
  icon,
  accent = "zinc",
  rightSlot,
}: Props) {
  const tone = ACCENTS[accent];
  const content = (
    <div className="group bg-white border border-suite-line rounded-2xl p-5 h-full flex flex-col gap-3 hover:border-suite-line-2 hover:shadow-[0_8px_30px_-12px_rgba(18,30,55,0.18)] transition-all">
      <div className="flex items-start justify-between gap-3">
        {icon && (
          <div className={cn("size-9 rounded-xl inline-flex items-center justify-center ring-1 [&_svg]:size-4", tone.tile, tone.ring)}>
            {icon}
          </div>
        )}
        {href && (
          <span className="size-7 rounded-full bg-suite-card-soft text-suite-ink-2 inline-flex items-center justify-center group-hover:bg-suite-navy group-hover:text-white transition-colors">
            <ArrowUpRight className="size-3.5" strokeWidth={2} />
          </span>
        )}
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wide text-suite-ink-2 font-medium">{label}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className={cn("text-2xl font-semibold suite-num", tone.text)}>{value}</span>
        </div>
        {hint && <div className="text-[11.5px] text-suite-ink-2 mt-1.5">{hint}</div>}
      </div>
      {rightSlot && <div className="mt-auto">{rightSlot}</div>}
    </div>
  );
  if (!href) return content;
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" className="block h-full">
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  );
}
