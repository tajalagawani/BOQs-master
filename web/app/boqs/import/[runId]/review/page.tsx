import Link from "next/link";
import fs from "node:fs/promises";
import { Header } from "@/components/Header";
import { SheetReview } from "@/components/SheetReview";
import { ArrowLeft } from "lucide-react";
import { inputPath } from "@/lib/paths";
import { readMeta } from "@/lib/runMeta";
import { inspectXlsx } from "@/lib/inspectXlsx";
import { notFound } from "next/navigation";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const meta = await readMeta(runId);
  if (!meta) notFound();

  let buf: Buffer;
  try {
    buf = await fs.readFile(inputPath(runId));
  } catch {
    notFound();
  }
  const sheets = await inspectXlsx(buf);

  return (
    <>
      <Header />
      <main className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full mx-auto max-w-[1480px] px-8 py-5 flex flex-col gap-4">
          <div>
            <Link
              href="/boqs"
              className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900"
            >
              <ArrowLeft className="size-4" strokeWidth={1.75} />
              Back to BOQs
            </Link>
            <h1 className="text-xl font-semibold text-zinc-900 mt-2">
              Review column mapping
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Verify that the detected columns match what your sheets actually
              contain. Use the dropdown next to each column to override.
            </p>
          </div>
          <div className="flex-1 min-h-0">
            <SheetReview
              runId={runId}
              initialSheets={sheets}
              originalName={meta.originalName}
            />
          </div>
        </div>
      </main>
    </>
  );
}
