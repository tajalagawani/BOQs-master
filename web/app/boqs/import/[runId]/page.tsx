import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { LiveLog } from "@/components/LiveLog";
import { ArrowLeft } from "lucide-react";
import { readMeta } from "@/lib/runMeta";

export default async function RunPage({
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
        <div className="h-full mx-auto max-w-[1480px] px-8 py-5 flex flex-col gap-3">
          <div>
            <Link
              href="/boqs"
              className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900"
            >
              <ArrowLeft className="size-4" strokeWidth={1.75} />
              Back to BOQs
            </Link>
            <h1 className="text-xl font-semibold text-zinc-900 mt-2">
              {meta.originalName}
            </h1>
            <p className="text-xs text-zinc-500">Run ID: {meta.runId}</p>
          </div>
          <div className="flex-1 min-h-0">
            <LiveLog runId={runId} />
          </div>
        </div>
      </main>
    </>
  );
}
