"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Header } from "@/components/Header";
import { ArrowLeft, FilePlus2, Loader2 } from "lucide-react";

export default function CreateProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    // For MVP, we don't persist yet — go to the demo "skyline-tower" workspace
    // so the user sees the dashboard. Real storage layer is the next step.
    setTimeout(() => router.push("/boqs/skyline-tower"), 400);
  };

  return (
    <>
      <Header />
      <main className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full mx-auto max-w-2xl px-6 py-6 flex flex-col gap-5">
          <Link
            href="/boqs"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 self-start"
          >
            <ArrowLeft className="size-3.5" strokeWidth={1.75} />
            Back to BOQs
          </Link>

          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="size-10 rounded-xl bg-zinc-100 inline-flex items-center justify-center">
                <FilePlus2 className="size-5 text-zinc-700" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
                  Create New Project
                </h1>
                <p className="text-xs text-zinc-500">
                  Start with a blank BOQ. You can add sections and items afterwards.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={create} className="flex flex-col gap-4">
            <Field label="Project name" required>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Skyline Tower Phase 2"
                className="w-full h-10 px-3 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-zinc-400"
              />
            </Field>

            <Field label="Location">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Country"
                className="w-full h-10 px-3 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-zinc-400"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Start date">
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-zinc-400"
                />
              </Field>
              <Field label="Expected end date">
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-zinc-400"
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Link
                href="/boqs"
                className="h-10 px-4 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 hover:border-zinc-400 inline-flex items-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={busy || !name.trim()}
                className={
                  "h-10 px-5 rounded-xl text-sm font-medium inline-flex items-center gap-2 " +
                  (busy || !name.trim()
                    ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                    : "bg-zinc-900 text-white hover:bg-zinc-800")
                }
              >
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <FilePlus2 className="size-4" strokeWidth={2} />
                    Create project
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-zinc-700">
        {label}{" "}
        {required && <span className="text-rose-600">*</span>}
      </span>
      {children}
    </label>
  );
}
