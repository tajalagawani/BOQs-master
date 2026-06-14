"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

interface Props {
  chart: string;
}

let renderId = 0;

export function Mermaid({ chart }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({
          startOnLoad: false,
          theme: "neutral",
          themeVariables: {
            fontFamily:
              "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
            primaryColor: "#fafafa",
            primaryTextColor: "#18181b",
            primaryBorderColor: "#e4e4e7",
            lineColor: "#a1a1aa",
          },
        });
        const id = `m-${++renderId}`;
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          setReady(true);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart]);

  if (error) {
    return (
      <div className="my-4 rounded-md border border-suite-dang/30 bg-suite-dang-bg px-3 py-2.5">
        <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-suite-dang">
          <AlertTriangle className="size-3" strokeWidth={2} /> Mermaid diagram failed
        </div>
        <pre className="mt-1 text-[11px] text-suite-dang whitespace-pre-wrap">{error}</pre>
        <pre className="mt-2 text-[11px] text-suite-ink-2 bg-white border border-suite-line rounded p-2 overflow-x-auto">
          {chart}
        </pre>
      </div>
    );
  }

  return (
    <div className="my-5 rounded-lg border border-suite-line bg-white px-4 py-5 overflow-x-auto">
      {!ready && (
        <div className="flex items-center gap-2 text-[12px] text-suite-ink-3 py-6 justify-center">
          <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
          Rendering diagram…
        </div>
      )}
      <div ref={ref} className="mermaid-container [&_svg]:max-w-full [&_svg]:h-auto [&_svg]:mx-auto" />
    </div>
  );
}
