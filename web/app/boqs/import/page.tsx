import Link from "next/link";
import { Header } from "@/components/Header";
import { UploadDropzone } from "@/components/UploadDropzone";
import { ArrowLeft } from "lucide-react";

export default function NewBoqPage() {
  return (
    <>
      <Header />
      <main className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full mx-auto max-w-3xl px-8 py-8 flex flex-col">
          <Link
            href="/boqs"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-5 self-start"
          >
            <ArrowLeft className="size-4" strokeWidth={1.75} />
            Back to BOQs
          </Link>

          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Import Existing BOQ
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500">
              Upload a Bill of Quantities Excel file. IOX will classify every
              priced item against POMI sections (A–R), NRM codes (Level 1–3),
              and ICMS Construction Cost groups.
            </p>
          </div>

          <UploadDropzone />

          <div className="mt-6 text-xs text-zinc-500">
            <span className="font-medium text-zinc-700">What happens next:</span>{" "}
            the file is processed locally on your machine using the POMI rule
            pack + fuzzy fallback. No data leaves your computer.
          </div>
        </div>
      </main>
    </>
  );
}
