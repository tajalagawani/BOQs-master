// Server component — renders markdown to JSX with IOX styling.
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/cn";

interface Props {
  content: string;
  className?: string;
}

export function MarkdownView({ content, className }: Props) {
  return (
    <article
      className={cn(
        // Typographic system tuned to IOX (zinc tones, tighter line height)
        "prose prose-zinc max-w-none",
        "prose-headings:scroll-mt-24 prose-headings:tracking-tight",
        "prose-h1:text-2xl prose-h1:font-semibold prose-h1:mb-4 prose-h1:mt-0",
        "prose-h2:text-xl  prose-h2:font-semibold prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-t prose-h2:border-zinc-200 prose-h2:pt-6",
        "prose-h3:text-base prose-h3:font-semibold prose-h3:mt-6  prose-h3:mb-2",
        "prose-p:text-[13.5px] prose-p:leading-relaxed prose-p:text-zinc-700",
        "prose-li:text-[13.5px] prose-li:leading-relaxed prose-li:text-zinc-700",
        "prose-a:text-zinc-900 prose-a:font-medium prose-a:underline-offset-2",
        "prose-code:text-[12.5px] prose-code:bg-zinc-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:bg-zinc-900 prose-pre:text-zinc-100 prose-pre:text-[12px] prose-pre:rounded-lg prose-pre:p-4",
        "prose-blockquote:border-l-zinc-300 prose-blockquote:text-zinc-600 prose-blockquote:font-normal prose-blockquote:not-italic",
        "prose-table:text-[12.5px]",
        "prose-th:bg-zinc-50 prose-th:font-medium prose-th:text-zinc-700 prose-th:px-3 prose-th:py-2 prose-th:border-zinc-200",
        "prose-td:px-3 prose-td:py-2 prose-td:align-top prose-td:border-zinc-200",
        "prose-hr:border-zinc-200",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, rehypeHighlight]}
        components={{
          // Wrap tables so they scroll horizontally on small viewports
          table: ({ ...props }) => (
            <div className="overflow-x-auto -mx-1 my-4">
              <table
                {...props}
                className="min-w-full text-left border-collapse border border-zinc-200 rounded-lg"
              />
            </div>
          ),
          // Open external links in a new tab
          a: ({ href, ...props }) => {
            const external = href?.startsWith("http");
            return (
              <a
                href={href}
                {...props}
                target={external ? "_blank" : undefined}
                rel={external ? "noreferrer noopener" : undefined}
              />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
