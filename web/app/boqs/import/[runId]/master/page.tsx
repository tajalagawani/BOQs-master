import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { ResultViewer } from "@/components/ResultViewer";
import { ArrowLeft } from "lucide-react";
import { readMeta } from "@/lib/runMeta";

export default async function MasterPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const meta = await readMeta(runId);
  if (!meta) notFound();

  return (
    <>
      <Header />
      <main className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full w-full px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/boqs"
                className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900"
              >
                <ArrowLeft className="size-3.5" strokeWidth={1.75} />
                BOQs
              </Link>
              <span className="text-zinc-300">/</span>
              <h1 className="text-sm font-semibold text-zinc-900 truncate">
                {meta.originalName}
              </h1>
              <span className="text-[11px] text-zinc-400 shrink-0">
                Run {meta.runId} · {meta.status}
              </span>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResultViewer runId={runId} />
          </div>
        </div>
      </main>
    </>
  );
}
