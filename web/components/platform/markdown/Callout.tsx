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
    cls: "border-suite-line bg-suite-neut-bg",
    icon: <Info className="size-3.5 text-suite-neut" strokeWidth={2} />,
  },
  tip: {
    label: "Tip",
    cls: "border-suite-good/30 bg-suite-good-bg",
    icon: <Lightbulb className="size-3.5 text-suite-good" strokeWidth={2} />,
  },
  important: {
    label: "Important",
    cls: "border-suite-line-2 bg-suite-card",
    icon: <Megaphone className="size-3.5 text-suite-ink-2" strokeWidth={2} />,
  },
  warning: {
    label: "Warning",
    cls: "border-suite-warn/30 bg-suite-warn-bg",
    icon: <AlertTriangle className="size-3.5 text-suite-warn" strokeWidth={2} />,
  },
  caution: {
    label: "Caution",
    cls: "border-suite-dang/30 bg-suite-dang-bg",
    icon: <AlertOctagon className="size-3.5 text-suite-dang" strokeWidth={2} />,
  },
  success: {
    label: "Success",
    cls: "border-suite-good/30 bg-suite-good-bg",
    icon: <CheckCircle2 className="size-3.5 text-suite-good" strokeWidth={2} />,
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
      <div className="flex items-center gap-1.5 mb-1.5 text-[11px] uppercase tracking-wide font-semibold text-suite-ink">
        {c.icon}
        {c.label}
      </div>
      <div className="text-suite-ink-2">{children}</div>
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
