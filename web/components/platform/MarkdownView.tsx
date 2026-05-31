// Server component — parses markdown into JSX with the IOX doc system.
//
// Features:
//   - GitHub-flavoured markdown (tables, task lists, strikethrough)
//   - GFM Alerts (`> [!NOTE]`, `> [!WARNING]`, etc.) → coloured callouts
//   - Mermaid blocks → client-side SVG diagrams
//   - Fenced code blocks → dark card with language pill + copy button
//   - h2/h3 get stable slug IDs and a hover-anchor link
//   - Tables wrap in a horizontally-scrolling container
//
// The TOC sidebar lives in `app/platform/docs/[...slug]/page.tsx` and
// is fed by `extractToc(content)` exported from this file.

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Children, isValidElement } from "react";
import { Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { CodeBlock } from "./markdown/CodeBlock";
import { Mermaid } from "./markdown/Mermaid";
import { Callout, detectAlertKind } from "./markdown/Callout";
import type { TocEntry } from "./markdown/Toc";

interface Props {
  content: string;
  className?: string;
}

export function MarkdownView({ content, className }: Props) {
  return (
    <article
      className={cn(
        "max-w-3xl text-zinc-700 leading-relaxed",
        // Headings
        "[&_h1]:text-[24px] [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-zinc-900 [&_h1]:mt-0 [&_h1]:mb-4",
        // Paragraph + list spacing
        "[&_p]:my-3 [&_p]:text-[13.5px] [&_p]:leading-7",
        "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1",
        "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1",
        "[&_li]:text-[13.5px] [&_li]:leading-7 [&_li>p]:my-1",
        // Links
        "[&_a]:text-zinc-900 [&_a]:underline [&_a]:underline-offset-[3px] [&_a]:decoration-zinc-300 hover:[&_a]:decoration-zinc-700",
        // Inline code
        "[&_:not(pre)>code]:text-[12px] [&_:not(pre)>code]:bg-zinc-100 [&_:not(pre)>code]:text-zinc-800 [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:rounded [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:before:content-none [&_:not(pre)>code]:after:content-none",
        // Tables
        "[&_table]:w-full [&_table]:text-[12.5px] [&_table]:my-5 [&_table]:border-collapse",
        "[&_thead]:bg-zinc-50",
        "[&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-zinc-700 [&_th]:border-b [&_th]:border-zinc-200",
        "[&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_td]:border-b [&_td]:border-zinc-100",
        "[&_tbody_tr:hover]:bg-zinc-50/60",
        // Horizontal rule
        "[&_hr]:my-8 [&_hr]:border-zinc-200",
        // Blockquote (non-alert)
        "[&_blockquote]:my-4 [&_blockquote]:pl-4 [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-300 [&_blockquote]:text-zinc-600 [&_blockquote]:italic",
        // Task lists
        "[&_input[type=checkbox]]:mr-2 [&_input[type=checkbox]]:accent-zinc-900",
        // Strong / em
        "[&_strong]:text-zinc-900 [&_strong]:font-semibold",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={mdComponents}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}

const mdComponents: Components = {
  h1: () => null, // Hidden — the page header already renders the title
  h2: ({ children, ...props }) => {
    const text = childrenText(children);
    const id = slugify(text);
    return (
      <h2
        id={id}
        className="group mt-10 mb-3 pt-6 border-t border-zinc-200 text-[18px] font-semibold tracking-tight text-zinc-900 scroll-mt-24"
        {...props}
      >
        <a
          href={`#${id}`}
          aria-label={`Link to ${text}`}
          className="no-underline inline-flex items-center gap-1.5"
        >
          {children}
          <LinkIcon
            className="size-3 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
            strokeWidth={2}
          />
        </a>
      </h2>
    );
  },
  h3: ({ children, ...props }) => {
    const text = childrenText(children);
    const id = slugify(text);
    return (
      <h3
        id={id}
        className="group mt-7 mb-2 text-[14.5px] font-semibold text-zinc-900 scroll-mt-24"
        {...props}
      >
        <a
          href={`#${id}`}
          aria-label={`Link to ${text}`}
          className="no-underline inline-flex items-center gap-1.5"
        >
          {children}
          <LinkIcon
            className="size-3 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
            strokeWidth={2}
          />
        </a>
      </h3>
    );
  },
  h4: ({ children }) => (
    <h4 className="mt-5 mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-zinc-500">
      {children}
    </h4>
  ),
  a: ({ href, children, ...rest }) => {
    const external = href?.startsWith("http://") || href?.startsWith("https://");
    return (
      <a
        href={href}
        {...rest}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer noopener" : undefined}
      >
        {children}
      </a>
    );
  },
  table: ({ children, ...props }) => (
    <div className="overflow-x-auto -mx-1 my-5">
      <table {...props} className="min-w-full">
        {children}
      </table>
    </div>
  ),
  blockquote: ({ children }) => {
    // Detect GFM alert syntax in the first inline text of the first
    // paragraph: `> [!NOTE]` / `> [!WARNING]` / etc.
    const firstP = firstChildOfType(children, "p");
    if (firstP) {
      const firstText = childrenText(firstP.props.children).trim();
      const kind = detectAlertKind(firstText);
      if (kind) {
        // Strip the [!KIND] marker from the first paragraph
        const stripped = stripAlertMarker(firstP.props.children);
        const rest = restAfter(children, firstP);
        return (
          <Callout kind={kind}>
            {stripped && (
              <p>{stripped}</p>
            )}
            {rest}
          </Callout>
        );
      }
    }
    return <blockquote>{children}</blockquote>;
  },
  pre: ({ children }) => {
    // <pre><code class="language-xxx">…</code></pre>
    const codeEl = firstChildOfType(children, "code");
    if (!codeEl) return <pre>{children}</pre>;
    const className = (codeEl.props.className ?? "") as string;
    const langMatch = /language-([\w-]+)/.exec(className);
    const language = langMatch?.[1];
    const raw = childrenText(codeEl.props.children);

    if (language === "mermaid") {
      return <Mermaid chart={raw} />;
    }
    return (
      <CodeBlock language={language} raw={raw}>
        {codeEl.props.children}
      </CodeBlock>
    );
  },
};

// ─── Public helpers ──────────────────────────────────────────────────────

/** Extract h2/h3 headings from a markdown string for the TOC. */
export function extractToc(md: string): TocEntry[] {
  const out: TocEntry[] = [];
  // Strip fenced code blocks so we don't pick up `## …` lines inside them
  const sanitised = md.replace(/```[\s\S]*?```/g, "");
  for (const line of sanitised.split(/\r?\n/)) {
    const m = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const depth = (m[1].length as 2 | 3);
    const text = m[2].replace(/`/g, "").replace(/\[([^\]]+)]\([^)]*\)/g, "$1").trim();
    out.push({ id: slugify(text), text, depth });
  }
  return out;
}

/** Approximate reading-time at 220 wpm (technical writing). */
export function readingTimeMinutes(md: string): number {
  const words = md.replace(/```[\s\S]*?```/g, "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

// ─── Local helpers ───────────────────────────────────────────────────────

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function childrenText(c: React.ReactNode): string {
  if (c == null || typeof c === "boolean") return "";
  if (typeof c === "string" || typeof c === "number") return String(c);
  if (Array.isArray(c)) return c.map(childrenText).join("");
  if (isValidElement(c)) {
    const props = c.props as { children?: React.ReactNode };
    return childrenText(props.children);
  }
  return "";
}

interface ReactElementLike {
  type: unknown;
  props: { children?: React.ReactNode; className?: string };
}

function firstChildOfType(
  children: React.ReactNode,
  type: string,
): ReactElementLike | null {
  const arr = Children.toArray(children);
  for (const c of arr) {
    if (isValidElement(c) && (c.type === type || (typeof c.type === "string" && c.type === type))) {
      return c as unknown as ReactElementLike;
    }
  }
  return null;
}

function restAfter(children: React.ReactNode, after: ReactElementLike): React.ReactNode[] {
  const arr = Children.toArray(children);
  const idx = arr.findIndex((c) => isValidElement(c) && c === (after as unknown));
  return idx >= 0 ? arr.slice(idx + 1) : [];
}

function stripAlertMarker(children: React.ReactNode): React.ReactNode {
  const arr = Children.toArray(children);
  return arr.map((c) => {
    if (typeof c === "string") {
      return c.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|SUCCESS)]\s*/i, "");
    }
    return c;
  });
}
