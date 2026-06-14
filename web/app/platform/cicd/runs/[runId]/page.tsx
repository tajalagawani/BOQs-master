export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  GitBranch,
  GitCommit,
  Clock,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  CircleDashed,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { requirePlatformAccess } from "@/lib/platform/auth";
import {
  getRun,
  listJobsForRun,
  listAnnotationsForRun,
  listArtifactsForRun,
} from "@/lib/platform/github";
import { JobAccordion } from "@/components/platform/JobAccordion";
import { AnnotationsList } from "@/components/platform/AnnotationsList";
import { ArtifactsList } from "@/components/platform/ArtifactsList";

interface PageProps {
  params: Promise<{ runId: string }>;
}

export default async function CiRunPage({ params }: PageProps) {
  await requirePlatformAccess();
  const { runId } = await params;
  const id = Number(runId);
  if (!Number.isFinite(id)) notFound();

  const [run, jobs, annotations, artifacts] = await Promise.all([
    getRun(id),
    listJobsForRun(id),
    listAnnotationsForRun(id),
    listArtifactsForRun(id),
  ]);

  if (!run) notFound();

  const tone =
    run.status !== "completed"
      ? { bar: "bg-suite-blue", chip: "bg-suite-blue-soft text-suite-blue ring-suite-blue-soft", icon: <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />, label: "In progress" }
      : run.conclusion === "success"
        ? { bar: "bg-suite-good", chip: "bg-suite-good-bg text-suite-good ring-suite-good-bg", icon: <CheckCircle2 className="size-3.5" strokeWidth={2} />, label: "Success" }
        : run.conclusion === "failure" || run.conclusion === "timed_out"
          ? { bar: "bg-suite-dang", chip: "bg-suite-dang-bg text-suite-dang ring-suite-dang-bg", icon: <XCircle className="size-3.5" strokeWidth={2} />, label: "Failed" }
          : run.conclusion === "cancelled"
            ? { bar: "bg-suite-ink-4", chip: "bg-suite-neut-bg text-suite-neut ring-suite-line", icon: <CircleDashed className="size-3.5" strokeWidth={2} />, label: "Cancelled" }
            : { bar: "bg-suite-ink-4", chip: "bg-suite-neut-bg text-suite-neut ring-suite-line", icon: <AlertCircle className="size-3.5" strokeWidth={2} />, label: run.conclusion ?? "—" };

  return (
    <div className="mx-auto max-w-7xl px-6 py-6 space-y-5">
      <Link
        href="/platform/cicd"
        className="inline-flex items-center gap-1.5 text-[12px] text-suite-ink-3 hover:text-suite-ink"
      >
        <ArrowLeft className="size-3.5" strokeWidth={2} /> Back to CI/CD
      </Link>

      {/* Run + Jobs side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] gap-5 items-start">
      {/* Hero (run) */}
      <section className="bg-white border border-suite-line rounded-2xl p-5 relative overflow-hidden lg:sticky lg:top-6">
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${tone.bar}`} />
        <div className="flex flex-wrap items-center gap-2 pl-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 h-7 text-[11.5px] font-medium ring-1 ${tone.chip}`}
          >
            {tone.icon}
            {tone.label}
          </span>
          <span className="text-[10.5px] font-mono font-medium text-suite-ink-2 bg-suite-card-soft px-1.5 py-0.5 rounded suite-num">
            #{run.id}
          </span>
          <span className="text-[10.5px] font-medium text-suite-ink-3 bg-suite-card-soft ring-1 ring-suite-line rounded-full px-2 py-0.5 capitalize">
            {run.event}
          </span>
          {run.attempt > 1 && (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-suite-warn bg-suite-warn-bg ring-1 ring-suite-warn-bg rounded-full px-2 py-0.5">
              <RefreshCw className="size-2.5" strokeWidth={2} /> Re-run #{run.attempt}
            </span>
          )}
        </div>
        <h1 className="mt-3 pl-2 text-[20px] font-semibold text-suite-ink leading-tight">
          {run.name}
        </h1>
        {(() => {
          const lines = run.commitMessage.split("\n");
          const subject = lines[0];
          const body = lines.slice(1).join("\n").trim();
          return (
            <>
              <p className="mt-1 pl-2 text-[13px] text-suite-ink-2 leading-relaxed font-medium">
                {subject}
              </p>
              {body && (
                <pre className="mt-2 pl-2 text-[12px] text-suite-ink-3 leading-relaxed whitespace-pre-wrap break-words font-sans max-w-full">
                  {body}
                </pre>
              )}
            </>
          );
        })()}

        <dl className="mt-4 pl-2 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2.5 text-[12px]">
          <Field
            label="Branch"
            value={
              <span className="inline-flex items-center gap-1">
                <GitBranch className="size-3 text-suite-ink-4" strokeWidth={2} />
                {run.branch}
              </span>
            }
          />
          <Field
            label="Commit"
            value={
              <span className="inline-flex items-center gap-1 font-mono text-[11.5px] suite-num">
                <GitCommit className="size-3 text-suite-ink-4" strokeWidth={2} />
                {run.commitSha.slice(0, 7)}
              </span>
            }
          />
          <Field
            label="Duration"
            value={
              run.durationSec != null ? (
                <span className="inline-flex items-center gap-1 tabular-nums suite-num">
                  <Clock className="size-3 text-suite-ink-4" strokeWidth={2} />
                  {formatDuration(run.durationSec)}
                </span>
              ) : (
                "—"
              )
            }
          />
          <Field
            label="Started"
            value={<time className="tabular-nums suite-num">{new Date(run.createdAt).toLocaleString()}</time>}
          />
        </dl>

        <div className="mt-4 pl-2 flex items-center gap-3 flex-wrap">
          {run.authorLogin && (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-suite-ink-2">
              {run.authorAvatar && (
                <Image
                  src={run.authorAvatar}
                  alt={run.authorLogin}
                  width={18}
                  height={18}
                  className="rounded-full"
                  unoptimized
                />
              )}
              {run.authorLogin}
            </span>
          )}
          <a
            href={run.htmlUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-suite-line bg-white text-[11.5px] text-suite-ink-2 hover:border-suite-line-2 hover:text-suite-ink"
          >
            View on GitHub <ExternalLink className="size-3" strokeWidth={1.75} />
          </a>
        </div>
      </section>

      {/* Jobs */}
      <section>
        <header className="flex items-baseline justify-between mb-2.5 px-1">
          <div>
            <h2 className="text-[12.5px] font-semibold text-suite-ink">Jobs</h2>
            <p className="text-[11px] text-suite-ink-3">
              {jobs.length} {jobs.length === 1 ? "job" : "jobs"} · {jobs.reduce((a, j) => a + j.steps.length, 0)} steps total
            </p>
          </div>
        </header>
        <JobAccordion jobs={jobs} />
      </section>
      </div>

      {/* Annotations */}
      {annotations.length > 0 && (
        <section>
          <header className="flex items-baseline justify-between mb-2.5 px-1">
            <div>
              <h2 className="text-[12.5px] font-semibold text-suite-ink">Annotations</h2>
              <p className="text-[11px] text-suite-ink-3">
                Inline errors/warnings emitted by check runs ({annotations.length}).
              </p>
            </div>
          </header>
          <AnnotationsList annotations={annotations} />
        </section>
      )}

      {/* Artifacts */}
      <section>
        <header className="flex items-baseline justify-between mb-2.5 px-1">
          <div>
            <h2 className="text-[12.5px] font-semibold text-suite-ink">Artifacts</h2>
            <p className="text-[11px] text-suite-ink-3">
              Build outputs uploaded by the run. Download via GitHub auth.
            </p>
          </div>
        </header>
        <ArtifactsList artifacts={artifacts} />
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-suite-ink-3 font-medium">{label}</dt>
      <dd className="mt-0.5 text-suite-ink font-medium">{value}</dd>
    </div>
  );
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}
