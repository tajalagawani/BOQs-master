"use client";

// RatesX AI Assistant — streaming chat over the tool-calling agent
// (/api/rates/assistant). Runs warehouse queries live; every answer is grounded.
//
// UI mirrors the HeroUI Pro PromptInput (status-driven send/stop) and
// ChainOfThought (collapsible agent steps) patterns. Those components aren't in
// the installed @heroui-pro/react@1.0.0-beta.4, so they're implemented here to
// the same shape — swap to the real ones on a Pro upgrade.

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Square, Loader2, ChevronDown, Brain, Copy, Check, ThumbsUp, ThumbsDown, RotateCcw } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

type ChatStatus = "ready" | "submitted" | "streaming";

interface ToolCall {
  name: string;
  input: unknown;
  result?: unknown;
}
interface Msg {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  error?: boolean;
  thinkingSecs?: number;
  messageId?: string;
}

// One shortcut per capability, grouped so the home page shows what the
// assistant can do across every tool.
const EXAMPLE_GROUPS: { label: string; items: string[] }[] = [
  {
    label: "Benchmarks",
    items: [
      "Benchmarked rate per m² for infrastructure works in the UAE?",
      "Break down the cost components of a residential building.",
      "What's the cost per key for hotels in the UAE?",
    ],
  },
  {
    label: "Market rates",
    items: [
      "Market rate per m² for AAC blockwork in the UAE?",
      "Market rate per m³ for granular fill in the UAE?",
      "How has the reinforced concrete rate changed year on year?",
    ],
  },
  {
    label: "Design & projects",
    items: [
      "How much concrete formwork per m² for a high-rise residential?",
      "Show me the profile for Dubai Hills Estate.",
      "Compare Dubai Hills Estate vs Al Furjan.",
    ],
  },
  {
    label: "Reference",
    items: [
      "What asset classes and countries does the library cover?",
      "Construction cost escalation from 2020 to 2024?",
    ],
  },
];

export function RatesAssistant() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<ChatStatus>("ready");
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  function patchLast(fn: (m: Msg) => Msg) {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice();
      next[next.length - 1] = fn(next[next.length - 1]);
      return next;
    });
  }

  function stop() {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("ready");
  }

  function send(text: string) {
    const q = text.trim();
    if (!q || status !== "ready") return;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: q }, { role: "assistant", content: "", toolCalls: [] }]);
    setInput("");
    void runStream(q, history);
  }

  // Re-answer the last user message (drops the previous answer, streams a fresh one).
  function regenerate() {
    if (status !== "ready") return;
    const n = messages.length;
    if (n < 2 || messages[n - 2].role !== "user") return;
    const userText = messages[n - 2].content;
    const history = messages.slice(0, n - 2).map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [
      ...prev.slice(0, n - 2),
      { role: "user", content: userText },
      { role: "assistant", content: "", toolCalls: [] },
    ]);
    void runStream(userText, history);
  }

  async function runStream(question: string, history: { role: "user" | "assistant"; content: string }[]) {
    setStatus("submitted");
    const startedAt = Date.now();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch("/api/rates/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}));
        patchLast((m) => ({ ...m, content: d.error ?? "Request failed.", error: true }));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          let ev: { type: string; text?: string; name?: string; input?: unknown; result?: unknown; message?: string; messageId?: string | null };
          try {
            ev = JSON.parse(line.slice(5).trim());
          } catch {
            continue;
          }
          if (ev.type === "done") {
            if (ev.messageId) patchLast((m) => ({ ...m, messageId: ev.messageId! }));
          } else if (ev.type === "text") {
            setStatus("streaming");
            patchLast((m) => ({ ...m, content: m.content + (ev.text ?? "") }));
          } else if (ev.type === "tool") {
            setStatus("streaming");
            patchLast((m) => ({ ...m, toolCalls: [...(m.toolCalls ?? []), { name: ev.name!, input: ev.input }] }));
          } else if (ev.type === "tool_result") {
            patchLast((m) => {
              const calls = (m.toolCalls ?? []).slice();
              for (let i = calls.length - 1; i >= 0; i--) {
                if (calls[i].name === ev.name && calls[i].result === undefined) {
                  calls[i] = { ...calls[i], result: ev.result };
                  break;
                }
              }
              return { ...m, toolCalls: calls };
            });
          } else if (ev.type === "error") {
            patchLast((m) => ({ ...m, content: ev.message ?? "Assistant error.", error: true }));
          }
        }
      }
      patchLast((m) => ({ ...m, thinkingSecs: Math.max(1, Math.round((Date.now() - startedAt) / 1000)) }));
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        patchLast((m) => ({ ...m, content: m.content || "Network error — try again.", error: !m.content }));
      }
    } finally {
      abortRef.current = null;
      setStatus("ready");
    }
  }

  // ChatGPT-style: empty = centered greeting + composer + chips; active =
  // messages column with the composer pinned to the bottom.
  if (messages.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center min-h-0 px-4 gap-7">
        <div className="text-center">
          <h1 className="text-[26px] sm:text-[30px] font-semibold tracking-tight text-zinc-800">
            What rate can I find for you?
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Benchmarks, material prices, cost breakdowns — answered live from the rates library.
          </p>
        </div>
        <div className="w-full max-w-3xl">
          <Composer value={input} onChange={setInput} onSubmit={() => send(input)} onStop={stop} status={status} autoFocus />
        </div>
        <div className="flex w-full max-w-3xl flex-col gap-3">
          {EXAMPLE_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col gap-1.5">
              <span className="px-1 text-[10.5px] font-medium uppercase tracking-wide text-zinc-400">
                {group.label}
              </span>
              <div className="flex flex-wrap gap-2">
                {group.items.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => send(ex)}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[12.5px] text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col min-h-0">
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 flex flex-col gap-7">
          {messages.map((m, i) => (
            <Bubble
              key={i}
              msg={m}
              question={
                m.role === "assistant" && i > 0 && messages[i - 1].role === "user"
                  ? messages[i - 1].content
                  : ""
              }
              streaming={status !== "ready" && i === messages.length - 1}
              isLast={i === messages.length - 1 && status === "ready"}
              onRegenerate={regenerate}
            />
          ))}
        </div>
      </div>
      <div className="shrink-0">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-4">
          <Composer value={input} onChange={setInput} onSubmit={() => send(input)} onStop={stop} status={status} />
          <p className="mt-2 text-center text-[10.5px] text-zinc-400">
            Computed live from the warehouse · not investment advice
          </p>
        </div>
      </div>
    </div>
  );
}

function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  status,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  status: ChatStatus;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(72, Math.min(el.scrollHeight, 280))}px`;
  }, [value]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="relative rounded-[30px] border border-zinc-200 bg-white shadow-[0_4px_24px_-10px_rgba(24,24,27,0.22)] focus-within:border-zinc-300 transition-colors">
        <textarea
          ref={ref}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          rows={2}
          placeholder="Ask about any rate, benchmark, or material…"
          className="w-full resize-none max-h-[280px] pl-5 pr-16 py-4 bg-transparent text-[16px] leading-relaxed placeholder:text-zinc-400 focus:outline-none"
        />
        <div className="absolute right-3 bottom-3">
          {status === "ready" ? (
            <button
              type="submit"
              disabled={!value.trim()}
              aria-label="Send"
              className="size-11 grid place-items-center rounded-full bg-zinc-900 text-white disabled:bg-zinc-200 disabled:text-zinc-400 hover:bg-zinc-800 transition-colors"
            >
              <ArrowUp className="size-5" strokeWidth={2.25} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop"
              className="size-11 grid place-items-center rounded-full bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
            >
              <Square className="size-4 fill-white" strokeWidth={0} />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

/* ─────────────────────── chain-of-thought (agent steps) ─────────────────────── */

const STEP_LABEL: Record<string, string> = {
  benchmark_rate: "Benchmark rate",
  market_rate: "Market rate",
  elemental_breakdown: "Elemental breakdown",
  escalation: "Escalation",
  list_dimensions: "Library dimensions",
};

function stepDetail(call: ToolCall): string {
  const i = (call.input ?? {}) as Record<string, unknown>;
  const filters = [
    Array.isArray(i.elements) ? (i.elements as string[]).join(", ") : undefined,
    i.assetClass,
    i.query,
    i.country,
    i.currency,
    i.fromYear && i.toYear ? `${i.fromYear}→${i.toYear}` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
  const r = call.result as Record<string, unknown> | undefined;
  let outcome = "running…";
  if (r) {
    const rows = Number(r.rows ?? r.totalRows ?? (Array.isArray(r.elements) ? (r.elements as unknown[]).length : 0));
    if (rows === 0) outcome = "no matching data";
    else if (typeof r.median === "number")
      outcome = `median ${Math.round(r.median).toLocaleString()} ${r.unit ?? ""} · ${r.projects ?? r.rows} samples`;
    else if (Array.isArray(r.perUnit) && r.perUnit.length)
      outcome = (r.perUnit as Record<string, unknown>[])
        .slice(0, 3)
        .map((u) => `${Math.round(Number(u.median)).toLocaleString()}/${u.unit}`)
        .join(", ");
    else if (typeof r.totalPerM2 === "number") outcome = `total ${r.totalPerM2.toLocaleString()} ${r.currency}/m²`;
    else if (typeof r.pct === "number") outcome = `+${r.pct}%`;
    else outcome = "done";
  }
  return `${filters || "—"} → ${outcome}`;
}

function Thoughts({ calls, streaming, secs }: { calls: ToolCall[]; streaming: boolean; secs?: number }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (streaming) setOpen(true);
  }, [streaming]);

  return (
    <div className="overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-zinc-500 hover:text-zinc-700"
      >
        {streaming ? <Loader2 className="size-3 animate-spin" /> : <Brain className="size-3" strokeWidth={1.75} />}
        <span className="font-medium">
          {streaming ? (
            <Shimmer>Thinking…</Shimmer>
          ) : (
            `Thought${secs ? ` for ${secs} second${secs === 1 ? "" : "s"}` : ""} · ${calls.length} quer${calls.length === 1 ? "y" : "ies"}`
          )}
        </span>
        <ChevronDown className={"size-3 ml-auto transition-transform " + (open ? "rotate-180" : "")} />
      </button>
      {open && (
        <ol className="px-2.5 pb-2 flex flex-col gap-1.5 border-t border-zinc-100 pt-1.5">
          {calls.map((c, i) => (
            <li key={i} className="flex gap-2 text-[11px]">
              <span
                className={
                  "shrink-0 mt-0.5 size-1.5 rounded-full " +
                  (c.result === undefined ? "bg-amber-400 animate-pulse" : "bg-emerald-500")
                }
              />
              <span className="min-w-0">
                <span className="font-medium text-zinc-700">{STEP_LABEL[c.name] ?? c.name}</span>{" "}
                <span className="text-zinc-500 wrap-break-word">{stepDetail(c)}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ─────────────────────── markdown ─────────────────────── */

const MD_COMPONENTS: Components = {
  p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-zinc-900">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc space-y-0.5 marker:text-zinc-400">{children}</ul>,
  ol: ({ children }) => <ol className="my-1.5 ml-4 list-decimal space-y-0.5 marker:text-zinc-400">{children}</ol>,
  li: ({ children }) => <li className="leading-snug pl-0.5">{children}</li>,
  h1: ({ children }) => <h3 className="mt-2 mb-1 text-[13px] font-semibold text-zinc-900">{children}</h3>,
  h2: ({ children }) => <h3 className="mt-2 mb-1 text-[13px] font-semibold text-zinc-900">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-2 mb-1 text-[12.5px] font-semibold text-zinc-800">{children}</h4>,
  code: ({ children }) => (
    <code className="px-1 py-0.5 rounded bg-zinc-100 text-[12px] font-mono text-zinc-800 tabular-nums">{children}</code>
  ),
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer noopener" className="text-emerald-700 underline underline-offset-2">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full text-[12px] border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-zinc-50">{children}</thead>,
  th: ({ children }) => <th className="border border-zinc-200 px-2 py-1 text-left font-medium text-zinc-600">{children}</th>,
  td: ({ children }) => <td className="border border-zinc-100 px-2 py-1 tabular-nums">{children}</td>,
  blockquote: ({ children }) => (
    <blockquote className="my-1.5 border-l-2 border-zinc-200 pl-2.5 text-zinc-600">{children}</blockquote>
  ),
  hr: () => <hr className="my-2 border-zinc-100" />,
};

// Block-level memoization (matches HeroUI Pro's Markdown): finished blocks
// don't re-parse on every streamed token — only the growing last block does.
const MarkdownBlock = memo(function MarkdownBlock({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
      {text}
    </ReactMarkdown>
  );
});

function AssistantMarkdown({ text }: { text: string }) {
  const blocks = useMemo(() => text.split(/\n{2,}/), [text]);
  return (
    <div className="text-sm text-zinc-800">
      {blocks.map((b, i) => (
        <MarkdownBlock key={i} text={b} />
      ))}
    </div>
  );
}

function Bubble({
  msg,
  question,
  streaming,
  isLast,
  onRegenerate,
}: {
  msg: Msg;
  question: string;
  streaming: boolean;
  isLast: boolean;
  onRegenerate: () => void;
}) {
  if (msg.role === "user") {
    return (
      <div className="self-end -mr-6 sm:-mr-16 max-w-[80%] px-4 py-2.5 rounded-3xl bg-zinc-100 text-zinc-900 text-[15px] leading-relaxed whitespace-pre-wrap">
        {msg.content}
      </div>
    );
  }
  return (
    <div className="w-full -ml-6 sm:-ml-16 group flex flex-col gap-2.5">
      {(msg.content || !streaming || msg.error) &&
        (msg.error ? (
          <div className="text-red-600 text-sm whitespace-pre-wrap">{msg.content}</div>
        ) : msg.content ? (
          <div className="text-[15px] leading-relaxed text-zinc-800">
            <AssistantMarkdown text={msg.content} />
          </div>
        ) : (
          <span className="text-[14px]">
            <Shimmer>Thinking…</Shimmer>
          </span>
        ))}
      {msg.toolCalls && msg.toolCalls.length > 0 && (
        <Thoughts calls={msg.toolCalls} streaming={streaming} secs={msg.thinkingSecs} />
      )}
      {!streaming && !msg.error && msg.content && (
        <div className={"transition-opacity " + (isLast ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
          <MessageActions text={msg.content} question={question} messageId={msg.messageId} isLast={isLast} onRegenerate={onRegenerate} />
        </div>
      )}
    </div>
  );
}

function Shimmer({ children }: { children: React.ReactNode }) {
  return <span className="iox-text-shimmer">{children}</span>;
}

function MessageActions({
  text,
  question,
  messageId,
  isLast,
  onRegenerate,
}: {
  text: string;
  question: string;
  messageId?: string;
  isLast: boolean;
  onRegenerate: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState("");
  const [sent, setSent] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const sendFeedback = async (v: "up" | "down", reasonText?: string) => {
    try {
      await fetch("/api/rates/assistant/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote: v, reason: reasonText, question, answer: text, messageId }),
      });
    } catch {
      /* feedback is best-effort — never block the chat */
    }
  };

  const onUp = () => {
    const next = vote === "up" ? null : "up";
    setVote(next);
    setShowReason(false);
    if (next === "up") {
      void sendFeedback("up");
      setSent(true);
      setTimeout(() => setSent(false), 2000);
    }
  };

  const onDown = () => {
    if (vote === "down") {
      setVote(null);
      setShowReason(false);
      return;
    }
    setVote("down");
    setShowReason(true);
    setSent(false);
  };

  const submitReason = async () => {
    await sendFeedback("down", reason);
    setShowReason(false);
    setReason("");
    setSent(true);
    setTimeout(() => setSent(false), 2500);
  };

  return (
    <div className="flex flex-col gap-2 px-1">
      <div className="flex items-center gap-0.5">
        <ActionBtn label="Copy" onClick={copy}>
          {copied ? <Check className="size-3.5 text-emerald-600" strokeWidth={2} /> : <Copy className="size-3.5" strokeWidth={1.75} />}
        </ActionBtn>
        <ActionBtn label="Good response" active={vote === "up"} onClick={onUp}>
          <ThumbsUp className="size-3.5" strokeWidth={1.75} />
        </ActionBtn>
        <ActionBtn label="Bad response" active={vote === "down"} onClick={onDown}>
          <ThumbsDown className="size-3.5" strokeWidth={1.75} />
        </ActionBtn>
        {isLast && (
          <ActionBtn label="Regenerate" onClick={onRegenerate}>
            <RotateCcw className="size-3.5" strokeWidth={1.75} />
          </ActionBtn>
        )}
        {sent && <span className="ml-1.5 text-[11px] text-emerald-600">Thanks — feedback saved</span>}
      </div>

      {showReason && (
        <div className="max-w-md rounded-lg border border-zinc-200 bg-zinc-50 p-2.5">
          <p className="mb-1.5 text-[12px] font-medium text-zinc-700">
            What was wrong with this response?
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            autoFocus
            placeholder="e.g. wrong number, missing data, misread the question, hallucinated a rate…"
            className="w-full resize-none rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-[13px] text-zinc-800 outline-none focus:border-zinc-400"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submitReason();
            }}
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setShowReason(false);
                setVote(null);
                setReason("");
              }}
              className="px-2 py-1 text-[12px] text-zinc-500 hover:text-zinc-700"
            >
              Cancel
            </button>
            <button
              onClick={() => void submitReason()}
              disabled={!reason.trim()}
              className="rounded-md bg-zinc-900 px-3 py-1 text-[12px] font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
            >
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={
        "size-7 grid place-items-center rounded-lg transition-colors hover:bg-zinc-100 " +
        (active ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-700")
      }
    >
      {children}
    </button>
  );
}
