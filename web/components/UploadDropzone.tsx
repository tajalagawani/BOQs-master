"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useCallback } from "react";
import { Upload, FileSpreadsheet, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export function UploadDropzone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickFile = useCallback((f: File | null) => {
    setError(null);
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".xlsx")) {
      setError("File must be .xlsx");
      return;
    }
    setFile(f);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      pickFile(e.dataTransfer.files?.[0] ?? null);
    },
    [pickFile],
  );

  const startRun = useCallback(async () => {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const r = await fetch("/api/upload", { method: "POST", body: form });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `upload failed (${r.status})`);
      }
      const { runId } = await r.json();
      router.push(`/boqs/import/${runId}/review`);
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [file, busy, router]);

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative rounded-2xl border-2 border-dashed p-12 flex flex-col items-center text-center transition-colors cursor-pointer",
          dragOver
            ? "border-zinc-900 bg-zinc-50"
            : "border-zinc-300 bg-white hover:border-zinc-400",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="sr-only"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        <div className="size-14 rounded-2xl bg-zinc-100 inline-flex items-center justify-center mb-4">
          <Upload className="size-6 text-zinc-700" strokeWidth={1.5} />
        </div>
        <div className="text-base font-semibold text-zinc-900">
          Drag and drop your BoQ Excel here
        </div>
        <div className="text-sm text-zinc-500 mt-1">
          or click to browse (.xlsx only)
        </div>
      </div>

      {file && (
        <div className="flex items-center gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-3">
          <FileSpreadsheet className="size-5 text-emerald-700" strokeWidth={1.5} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-zinc-900 truncate">
              {file.name}
            </div>
            <div className="text-xs text-zinc-500">
              {(file.size / 1024).toFixed(0)} KB · ready to process
            </div>
          </div>
          <button
            onClick={() => setFile(null)}
            className="size-8 rounded-md hover:bg-zinc-100 inline-flex items-center justify-center"
            aria-label="Clear file"
            type="button"
          >
            <X className="size-4 text-zinc-500" />
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <button
        onClick={startRun}
        disabled={!file || busy}
        type="button"
        className={cn(
          "h-11 rounded-xl text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors",
          !file || busy
            ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
            : "bg-zinc-900 text-white hover:bg-zinc-800",
        )}
      >
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Starting run…
          </>
        ) : (
          <>
            <Upload className="size-4" />
            Start POMI coding
          </>
        )}
      </button>
    </div>
  );
}
