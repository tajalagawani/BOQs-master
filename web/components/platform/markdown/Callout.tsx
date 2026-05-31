import {
  Info,
  AlertTriangle,
  AlertOctagon,
  Lightbulb,
  CheckCircle2,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/cn";

export type CalloutKind = "note" | "tip" | "important" | "warning" | "caution" | "success";

interface Props {
  kind: CalloutKind;
  children: React.ReactNode;
}

const CONFIG: Record<
  CalloutKind,
  { label: string; cls: string; icon: React.ReactNode }
> = {
  note: {
    label: "Note",
    cls: "border-sky-200 bg-sky-50/60",
    icon: <Info className="size-3.5 text-sky-700" strokeWidth={2} />,
  },
  tip: {
    label: "Tip",
    cls: "border-emerald-200 bg-emerald-50/60",
    icon: <Lightbulb className="size-3.5 text-emerald-700" strokeWidth={2} />,
  },
  important: {
    label: "Important",
    cls: "border-violet-200 bg-violet-50/60",
    icon: <Megaphone className="size-3.5 text-violet-700" strokeWidth={2} />,
  },
  warning: {
    label: "Warning",
    cls: "border-amber-200 bg-amber-50/60",
    icon: <AlertTriangle className="size-3.5 text-amber-700" strokeWidth={2} />,
  },
  caution: {
    label: "Caution",
    cls: "border-rose-200 bg-rose-50/60",
    icon: <AlertOctagon className="size-3.5 text-rose-700" strokeWidth={2} />,
  },
  success: {
    label: "Success",
    cls: "border-emerald-200 bg-emerald-50/60",
    icon: <CheckCircle2 className="size-3.5 text-emerald-700" strokeWidth={2} />,
  },
};

export function Callout({ kind, children }: Props) {
  const c = CONFIG[kind];
  return (
    <aside
      className={cn(
        "my-5 rounded-lg border px-4 py-3 [&>p]:my-0 [&>p+p]:mt-2 [&>p]:text-[13px] [&>p]:leading-relaxed",
        c.cls,
      )}
    >
      <div className="flex items-center gap-1.5 mb-1.5 text-[11px] uppercase tracking-wide font-semibold text-zinc-800">
        {c.icon}
        {c.label}
      </div>
      <div className="text-zinc-700">{children}</div>
    </aside>
  );
}

/** Detect GitHub-style alert from a blockquote's first child paragraph. */
export function detectAlertKind(text: string): CalloutKind | null {
  const m = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|SUCCESS)]\s*/i.exec(text);
  if (!m) return null;
  const kind = m[1].toLowerCase() as CalloutKind;
  return kind;
}
