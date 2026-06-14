import Link from "next/link";
import fs from "node:fs/promises";
import { Header } from "@/components/Header";
import { SheetReview } from "@/components/SheetReview";
import { ArrowLeft, FileWarning } from "lucide-react";
import { inputPath } from "@/lib/paths";
import { readMeta } from "@/lib/runMeta";
import { inspectXlsx, type SheetInspection } from "@/lib/inspectXlsx";
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

  // A non-xlsx upload (placeholder, renamed file, legacy .xls) must not crash
  // the page — surface a clear message and let the user re-upload.
  let sheets: SheetInspection[] | null = null;
  let inspectError: string | null = null;
  try {
    sheets = await inspectXlsx(buf);
  } catch (e) {
    inspectError =
      e instanceof Error ? e.message : "This file could not be read as an Excel workbook.";
  }

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
            {inspectError ? (
              <div className="h-full flex items-center justify-center">
                <div className="max-w-md text-center rounded-2xl border border-amber-200 bg-amber-50/60 px-8 py-10">
                  <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <FileWarning className="size-6" strokeWidth={1.75} />
                  </div>
                  <h2 className="text-base font-semibold text-zinc-900">
                    This file can&rsquo;t be read as a workbook
                  </h2>
                  <p className="mt-1.5 text-sm text-zinc-600">{inspectError}</p>
                  {meta.originalName && (
                    <p className="mt-2 text-xs text-zinc-400">
                      Uploaded as: {meta.originalName}
                    </p>
                  )}
                  <Link
                    href="/boqs"
                    className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                  >
                    <ArrowLeft className="size-4" strokeWidth={1.75} />
                    Upload a different file
                  </Link>
                </div>
              </div>
            ) : (
              <SheetReview
                runId={runId}
                initialSheets={sheets ?? []}
                originalName={meta.originalName}
              />
            )}
          </div>
        </div>
      </main>
    </>
  );
}
