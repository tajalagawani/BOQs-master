import { AlertTriangle, AlertOctagon, Info } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CiAnnotation } from "@/lib/platform/github";

interface Props {
  annotations: CiAnnotation[];
}

export function AnnotationsList({ annotations }: Props) {
  if (annotations.length === 0) {
    return (
      <div className="bg-suite-good-bg border border-suite-good-bg rounded-md px-4 py-4 text-center text-[12px] text-suite-good">
        No annotations from check runs
      </div>
    );
  }
  return (
    <ul className="divide-y divide-suite-line-soft border border-suite-line rounded-md overflow-hidden bg-white">
      {annotations.map((a, i) => {
        const tone =
          a.level === "failure"
            ? { bg: "bg-suite-dang-bg/60", text: "text-suite-dang", icon: <AlertOctagon className="size-3" strokeWidth={2} />, ring: "text-suite-dang" }
            : a.level === "warning"
              ? { bg: "bg-suite-warn-bg/60", text: "text-suite-warn", icon: <AlertTriangle className="size-3" strokeWidth={2} />, ring: "text-suite-warn" }
              : { bg: "", text: "text-suite-ink-2", icon: <Info className="size-3" strokeWidth={2} />, ring: "text-suite-ink-3" };
        return (
          <li key={i} className={cn("px-3 py-2.5", tone.bg)}>
            <div className="flex items-center gap-2 text-[11px]">
              <span className={tone.ring}>{tone.icon}</span>
              <span className="font-medium capitalize">{a.level}</span>
              {a.title && <span className="text-suite-ink-2">· {a.title}</span>}
              {a.path && (
                <code className="ml-auto text-[10.5px] bg-suite-card-soft rounded px-1.5 py-0.5 suite-num">
                  {a.path}
                  {a.startLine ? `:${a.startLine}` : ""}
                </code>
              )}
            </div>
            <div className={cn("mt-1 text-[12px] font-mono whitespace-pre-wrap break-words suite-num", tone.text)}>
              {a.message}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
