"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  language?: string;
  children: React.ReactNode;
  /** Raw text source, so the copy button captures the original (not the
   *  highlighted HTML). */
  raw: string;
}

const LABELS: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TSX",
  js: "JavaScript",
  jsx: "JSX",
  bash: "bash",
  sh: "shell",
  zsh: "zsh",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  py: "Python",
  python: "Python",
  sql: "SQL",
  md: "Markdown",
  prisma: "Prisma",
  kql: "Kusto",
  http: "HTTP",
};

export function CodeBlock({ language, children, raw }: Props) {
  const [copied, setCopied] = useState(false);
  const label = language ? (LABELS[language] ?? language) : null;

  function copy() {
    navigator.clipboard.writeText(raw).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="group relative my-4 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800">
      <div className="flex items-center justify-between border-b border-zinc-800/70 px-3.5 py-1.5 text-[10.5px] text-zinc-400 font-mono">
        <span className="uppercase tracking-wide">{label ?? "text"}</span>
        <button
          type="button"
          onClick={copy}
          className={cn(
            "inline-flex items-center gap-1 px-1.5 h-5 rounded transition-colors",
            copied
              ? "text-emerald-400 bg-emerald-500/10"
              : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60",
          )}
        >
          {copied ? (
            <>
              <Check className="size-3" strokeWidth={2} /> Copied
            </>
          ) : (
            <>
              <Copy className="size-3" strokeWidth={2} /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="px-4 py-3 text-[12px] leading-relaxed overflow-x-auto text-zinc-100 font-mono [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit">
        {children}
      </pre>
    </div>
  );
}
