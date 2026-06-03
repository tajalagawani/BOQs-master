import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { LiveMapping } from "@/components/boqs/LiveMapping";
import { ArrowLeft } from "lucide-react";
import { readMeta } from "@/lib/runMeta";

export default async function RunPage({
  params,
  searchParams,
}: {
  params: Promise<{ runId: string }>;
  searchParams: Promise<{ model?: string }>;
}) {
  const { runId } = await params;
  const { model } = await searchParams;
  const meta = await readMeta(runId);
  if (!meta) notFound();

  return (
    <>
      <Header />
      <main className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full w-full px-3 py-2.5 flex flex-col gap-2">
          <div className="flex items-center gap-3 shrink-0 px-1">
            <Link
              href="/boqs"
              className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 shrink-0"
            >
              <ArrowLeft className="size-4" strokeWidth={1.75} />
              Back
            </Link>
            <span className="text-zinc-300">/</span>
            <h1 className="text-sm font-semibold text-zinc-900 truncate">
              {meta.originalName}
            </h1>
            <span className="text-xs text-zinc-400 shrink-0">Run {meta.runId}</span>
          </div>
          <div className="flex-1 min-h-0">
            <LiveMapping runId={runId} model={model} />
          </div>
        </div>
      </main>
    </>
  );
}
