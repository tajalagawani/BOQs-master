export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Layers,
} from "lucide-react";
import { requirePlatformAccess } from "@/lib/platform/auth";
import { getKpi } from "@/lib/platform/kpis";
import { statusTone } from "@/lib/platform/kpi-types";
import { StatusPill } from "@/components/platform/StatusPill";

interface PageProps {
  params: Promise<{ kpi: string }>;
}

export default async function KpiDetailPage({ params }: PageProps) {
  await requirePlatformAccess();
  const { kpi: kpiId } = await params;
  const kpi = await getKpi(kpiId);
  if (!kpi) notFound();

  const tone = statusTone(kpi.status);

  return (
    <div className="mx-auto max-w-4xl px-6 py-6 space-y-5">
      <Link
        href="/platform/kpis"
        className="inline-flex items-center gap-1.5 text-[12px] text-suite-ink-2 hover:text-suite-ink"
      >
        <ArrowLeft className="size-3.5" strokeWidth={2} /> Back to KPI board
      </Link>

      {/* Hero */}
      <section className="bg-white border border-suite-line rounded-2xl p-6 relative overflow-hidden">
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${tone.bar}`} />
        <div className="flex flex-wrap items-center gap-2">
          <span className="suite-num text-[11px] font-semibold tracking-wide text-suite-ink-2 bg-suite-card-soft border border-suite-line px-2 py-0.5 rounded">
            {kpi.kpi}
          </span>
          <StatusPill status={kpi.status} size="md" />
          {kpi.phase > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-suite-ink-2 bg-suite-card-soft ring-1 ring-suite-line rounded-full px-2 py-0.5">
              <Layers className="size-2.5" strokeWidth={2} /> Phase {kpi.phase}
            </span>
          )}
          <span className="text-[11px] text-suite-ink-2 ml-1">
            {kpi.componentRef}. {kpi.component}
          </span>
        </div>
        <h1 className="mt-3 text-[22px] font-semibold text-suite-ink leading-tight">
          {kpi.subComponent}
        </h1>
      </section>

      {/* Have / Missing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Block
          icon={<CheckCircle2 className="size-3.5" strokeWidth={2} />}
          tone="emerald"
          title="What we have"
        >
          {kpi.weHave ? (
            <p className="text-[12.5px] text-suite-ink-2 leading-relaxed">{kpi.weHave}</p>
          ) : (
            <p className="text-[12px] text-suite-ink-3 italic">
              Not annotated in BACKLOG.md
            </p>
          )}
        </Block>
        <Block
          icon={<AlertCircle className="size-3.5" strokeWidth={2} />}
          tone={kpi.status === "green" ? "zinc" : "amber"}
          title={kpi.status === "green" ? "Notes" : "What's missing"}
        >
          {kpi.missing ? (
            <p className="text-[12.5px] text-suite-ink-2 leading-relaxed">{kpi.missing}</p>
          ) : (
            <p className="text-[12px] text-suite-ink-3 italic">
              {kpi.status === "green" ? "No outstanding action." : "Not annotated."}
            </p>
          )}
        </Block>
      </div>

      {/* Evidence */}
      <section className="bg-white border border-suite-line rounded-2xl p-5">
        <header className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-[13px] font-semibold text-suite-ink">Evidence</h2>
            <p className="text-[11px] text-suite-ink-2">
              From the assessor sign-off matrix.
            </p>
          </div>
          <span className="suite-num text-[11px] text-suite-ink-2">
            {kpi.evidencePaths.length}{" "}
            {kpi.evidencePaths.length === 1 ? "link" : "links"}
          </span>
        </header>
        {kpi.evidence ? (
          <p className="text-[12.5px] text-suite-ink-2 leading-relaxed mb-3">
            {kpi.evidence
              .replace(/`([^`]+)`/g, "$1")
              .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")}
          </p>
        ) : null}
        {kpi.evidencePaths.length > 0 && (
          <ul className="divide-y divide-suite-line-soft">
            {kpi.evidencePaths.map((p) => (
              <li key={p} className="py-2 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 min-w-0 text-[12.5px] text-suite-ink">
                  <FileText className="size-3.5 text-suite-ink-3 shrink-0" strokeWidth={1.75} />
                  <code className="suite-num truncate text-[11.5px] bg-suite-card-soft border border-suite-line px-1.5 py-0.5 rounded">
                    {p}
                  </code>
                </span>
                {linkFor(p)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Block({
  icon,
  tone,
  title,
  children,
}: {
  icon: React.ReactNode;
  tone: "emerald" | "amber" | "zinc";
  title: string;
  children: React.ReactNode;
}) {
  const toneCls =
    tone === "emerald"
      ? "ring-suite-good/30 bg-suite-good-bg text-suite-good"
      : tone === "amber"
        ? "ring-suite-warn/30 bg-suite-warn-bg text-suite-warn"
        : "ring-suite-line bg-suite-card-soft text-suite-ink-2";
  return (
    <div className="bg-white border border-suite-line rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`size-6 rounded-md inline-flex items-center justify-center ring-1 ${toneCls}`}
        >
          {icon}
        </span>
        <h3 className="text-[12.5px] font-semibold text-suite-ink">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function linkFor(p: string) {
  // Only docs/*.md (and .yaml) get an in-app link via /platform/docs
  if (p.startsWith("docs/") && (p.endsWith(".md") || p.endsWith(".mdx"))) {
    const slug = p.replace(/^docs\//, "").replace(/\.mdx?$/, "");
    return (
      <Link
        href={`/platform/docs/${slug}`}
        className="text-[11.5px] font-medium text-suite-ink-2 hover:text-suite-ink inline-flex items-center gap-1 shrink-0"
      >
        Open <ExternalLink className="size-3" strokeWidth={1.75} />
      </Link>
    );
  }
  if (p.startsWith("docs/api/") && p.endsWith(".yaml")) {
    return (
      <span className="text-[11px] text-suite-ink-3 shrink-0">YAML spec</span>
    );
  }
  return <span className="text-[11px] text-suite-ink-3 shrink-0">file</span>;
}
