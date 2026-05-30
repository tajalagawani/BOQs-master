// Always read live project store — no static caching
export const dynamic = "force-dynamic";

import Link from "next/link";
import { Header } from "@/components/Header";
import { ModuleCard } from "@/components/ModuleCard";
import { ArrowLeft, FilePlus2, Upload, FileSpreadsheet } from "lucide-react";
import { demoProjects } from "@/lib/demoProjects";
import { fmtINR } from "@/lib/demoBoq";
import { listProjects } from "@/lib/projectStore";

interface CardEntry {
  id: string;
  title: string;
  description: string;
}

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!t) return "";
  const sec = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} h ago`;
  return `${Math.floor(sec / 86400)} d ago`;
}

export default async function BoqsHome() {
  const imported = await listProjects();
  const cards: CardEntry[] = [
    ...imported.map((p) => ({
      id: p.id,
      title: p.name,
      description:
        p.status === "complete"
          ? `Imported · ${timeAgo(p.completedAt)} · ${p.fileName.slice(0, 40)}`
          : p.status === "processing"
          ? `Processing… · started ${timeAgo(p.createdAt)}`
          : `Failed · ${timeAgo(p.completedAt)}`,
    })),
    ...demoProjects.map((p) => ({
      id: p.id,
      title: p.name,
      description: `${p.location} · ${p.items} items · ${fmtINR(p.totalAmount)}`,
    })),
  ];

  return (
    <>
      <Header />
      <main className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full w-full max-w-[1480px] mx-auto px-6 py-5 flex flex-col gap-5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 self-start"
          >
            <ArrowLeft className="size-3.5" strokeWidth={1.75} />
            Back to dashboard
          </Link>

          <div className="shrink-0">
            <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-zinc-900">
              BOQs Management
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Create a new Bill of Quantities or import an existing one to get started.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 shrink-0">
            <div className="w-[240px]">
              <ModuleCard
                icon={<FilePlus2 className="size-6" strokeWidth={1.25} />}
                title="Create New Project"
                description="Start a blank Bill of Quantities. Add sections, trades and items."
                href="/boqs/create"
              />
            </div>
            <div className="w-[240px]">
              <ModuleCard
                icon={<Upload className="size-6" strokeWidth={1.25} />}
                title="Import Existing BOQ"
                description="Upload an Excel BoQ. IOX classifies items against POMI and NRM."
                href="/boqs/import"
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-900">
                Recent Projects
              </h2>
              <span className="text-xs text-zinc-500">
                {cards.length} project{cards.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                {cards.map((c) => (
                  <ModuleCard
                    key={c.id}
                    icon={<FileSpreadsheet className="size-6" strokeWidth={1.25} />}
                    title={c.title}
                    description={c.description}
                    href={`/boqs/${c.id}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
