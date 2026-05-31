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
  zinc:    { ring: "ring-zinc-200",    tile: "bg-zinc-900 text-white", text: "text-zinc-900" },
  emerald: { ring: "ring-emerald-100", tile: "bg-emerald-50 text-emerald-700", text: "text-emerald-700" },
  amber:   { ring: "ring-amber-100",   tile: "bg-amber-50 text-amber-700",     text: "text-amber-700" },
  rose:    { ring: "ring-rose-100",    tile: "bg-rose-50 text-rose-700",       text: "text-rose-700" },
  sky:     { ring: "ring-sky-100",     tile: "bg-sky-50 text-sky-700",         text: "text-sky-700" },
  violet:  { ring: "ring-violet-100",  tile: "bg-violet-50 text-violet-700",   text: "text-violet-700" },
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
    <div className="group bg-white border border-zinc-200 rounded-2xl p-5 h-full flex flex-col gap-3 hover:border-zinc-300 hover:shadow-[0_8px_30px_-12px_rgba(24,24,27,0.18)] transition-all">
      <div className="flex items-start justify-between gap-3">
        {icon && (
          <div className={cn("size-9 rounded-xl inline-flex items-center justify-center ring-1 [&_svg]:size-4", tone.tile, tone.ring)}>
            {icon}
          </div>
        )}
        {href && (
          <span className="size-7 rounded-full bg-zinc-100 text-zinc-500 inline-flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-colors">
            <ArrowUpRight className="size-3.5" strokeWidth={2} />
          </span>
        )}
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wide text-zinc-500 font-medium">{label}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className={cn("text-2xl font-semibold tabular-nums", tone.text)}>{value}</span>
        </div>
        {hint && <div className="text-[11.5px] text-zinc-500 mt-1.5">{hint}</div>}
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
