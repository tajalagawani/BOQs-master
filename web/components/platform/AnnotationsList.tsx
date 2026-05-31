import { AlertTriangle, AlertOctagon, Info } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CiAnnotation } from "@/lib/platform/github";

interface Props {
  annotations: CiAnnotation[];
}

export function AnnotationsList({ annotations }: Props) {
  if (annotations.length === 0) {
    return (
      <div className="bg-emerald-50/40 border border-emerald-100 rounded-md px-4 py-4 text-center text-[12px] text-emerald-900">
        No annotations from check runs
      </div>
    );
  }
  return (
    <ul className="divide-y divide-zinc-100 border border-zinc-200 rounded-md overflow-hidden bg-white">
      {annotations.map((a, i) => {
        const tone =
          a.level === "failure"
            ? { bg: "bg-rose-50/40", text: "text-rose-900", icon: <AlertOctagon className="size-3" strokeWidth={2} />, ring: "text-rose-700" }
            : a.level === "warning"
              ? { bg: "bg-amber-50/40", text: "text-amber-900", icon: <AlertTriangle className="size-3" strokeWidth={2} />, ring: "text-amber-700" }
              : { bg: "", text: "text-zinc-700", icon: <Info className="size-3" strokeWidth={2} />, ring: "text-zinc-500" };
        return (
          <li key={i} className={cn("px-3 py-2.5", tone.bg)}>
            <div className="flex items-center gap-2 text-[11px]">
              <span className={tone.ring}>{tone.icon}</span>
              <span className="font-medium capitalize">{a.level}</span>
              {a.title && <span className="text-zinc-700">· {a.title}</span>}
              {a.path && (
                <code className="ml-auto text-[10.5px] bg-zinc-100 rounded px-1.5 py-0.5">
                  {a.path}
                  {a.startLine ? `:${a.startLine}` : ""}
                </code>
              )}
            </div>
            <div className={cn("mt-1 text-[12px] font-mono whitespace-pre-wrap break-words", tone.text)}>
              {a.message}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
