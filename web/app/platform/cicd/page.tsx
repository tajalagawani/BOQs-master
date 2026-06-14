export const dynamic = "force-dynamic";
export const revalidate = 60;

import Link from "next/link";
import {
  GitBranch,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Activity,
  GitPullRequest,
  Rocket,
} from "lucide-react";
import { requirePlatformAccess } from "@/lib/platform/auth";
import {
  listRecentRuns,
  getCiStats,
  getWorkflowScorecards,
  listMainCommits,
  getDeployFreshness,
  listOpenPullRequests,
} from "@/lib/platform/github";
import { githubConfigured, platformEnvSync } from "@/lib/platform/platform-env";
import { CiRunList } from "@/components/platform/CiRunList";
import { CiOverviewBanner } from "@/components/platform/CiOverviewBanner";
import { WorkflowCard } from "@/components/platform/WorkflowCard";
import { CommitsFeed } from "@/components/platform/CommitsFeed";
import { DeployDiff } from "@/components/platform/DeployDiff";
import { PrList } from "@/components/platform/PrList";
import { CredentialsRequired } from "@/components/platform/CredentialsRequired";

export default async function CicdPage() {
  await requirePlatformAccess();

  if (!(await githubConfigured())) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-6 space-y-5">
        <Hero />
        <CredentialsRequired
          title="GitHub credentials required"
          description="Set a read-only GitHub Personal Access Token to surface live workflow runs, commits, PRs, and deploy diff. Token only needs actions:read + metadata:read + pull_requests:read + contents:read on this repository."
          vars={[
            { name: "GH_TOKEN", hint: "fine-grained PAT recommended" },
            { name: "GH_OWNER", hint: 'default "tajalagawani"' },
            { name: "GH_REPO", hint: 'default "BOQs-master"' },
          ]}
          setupCommand={`# Create a fine-grained PAT at:
# https://github.com/settings/personal-access-tokens/new
# Required permissions:
#  - Actions (read)
#  - Metadata (read)
#  - Pull requests (read)
#  - Contents (read)

# Then add to web/.env:
GH_TOKEN="github_pat_…"`}
        />
      </div>
    );
  }

  const [runs, stats, workflows, commits, freshness, prs] = await Promise.all([
    listRecentRuns(25),
    getCiStats(),
    getWorkflowScorecards(),
    listMainCommits(15),
    getDeployFreshness(),
    listOpenPullRequests(10),
  ]);

  const repoLink = `https://github.com/${platformEnvSync.GH_OWNER}/${platformEnvSync.GH_REPO}`;

  return (
    <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
      <Hero repoLink={`${repoLink}/actions`} />

      <CiOverviewBanner runs={runs} deployFreshness={freshness} />

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <Stat
            label="Success rate"
            value={stats.total === 0 ? "—" : `${stats.successRate}%`}
            tone={
              stats.successRate >= 90 ? "emerald" : stats.successRate >= 70 ? "amber" : "rose"
            }
            icon={<CheckCircle2 className="size-3.5" strokeWidth={1.75} />}
            hint={`Last ${stats.total} runs`}
          />
          <Stat
            label="Avg duration"
            value={formatDuration(stats.avgDurationSec)}
            tone="zinc"
            icon={<Clock className="size-3.5" strokeWidth={1.75} />}
            hint="Push → live"
          />
          <Stat
            label="Failures"
            value={stats.failure}
            tone={stats.failure === 0 ? "emerald" : "rose"}
            icon={<XCircle className="size-3.5" strokeWidth={1.75} />}
            hint={stats.latestFailure ? `Last: ${timeAgo(stats.latestFailure.createdAt)}` : "None"}
          />
          <Stat
            label="In progress"
            value={stats.inProgress}
            tone={stats.inProgress > 0 ? "amber" : "zinc"}
            icon={<Activity className="size-3.5" strokeWidth={1.75} />}
            hint={stats.inProgress > 0 ? "Live" : "Idle"}
          />
          <Stat
            label="Deploy freshness"
            value={
              freshness?.commitsBehind == null
                ? "—"
                : freshness.commitsBehind === 0
                  ? "✓ HEAD"
                  : `${freshness.commitsBehind} behind`
            }
            tone={
              freshness?.commitsBehind === 0
                ? "emerald"
                : freshness?.commitsBehind != null && freshness.commitsBehind > 5
                  ? "rose"
                  : "amber"
            }
            icon={<Rocket className="size-3.5" strokeWidth={1.75} />}
            hint={
              freshness?.deployedSha
                ? `Live: ${freshness.deployedSha.slice(0, 7)}`
                : "Unknown"
            }
          />
          <Stat
            label="Open PRs"
            value={prs.length}
            tone={prs.length === 0 ? "emerald" : "zinc"}
            icon={<GitPullRequest className="size-3.5" strokeWidth={1.75} />}
            hint={
              prs.filter((p) => !p.draft).length > 0
                ? `${prs.filter((p) => !p.draft).length} ready`
                : "All drafts"
            }
          />
        </div>
      )}

      {/* Workflows grid */}
      {workflows.length > 0 && (
        <section>
          <SectionHeader title="Workflows" subtitle={`${workflows.length} registered with GitHub Actions`}>
            <Link
              href={`${repoLink}/actions`}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[11.5px] text-suite-ink-2 hover:text-suite-ink inline-flex items-center gap-1"
            >
              GitHub <ExternalLink className="size-2.5" strokeWidth={2} />
            </Link>
          </SectionHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {workflows.map((wf) => (
              <WorkflowCard key={wf.id} workflow={wf} />
            ))}
          </div>
        </section>
      )}

      {/* Recent runs */}
      <section>
        <SectionHeader title="Recent runs" subtitle={`Last ${runs.length} across all workflows`} />
        <CiRunList runs={runs} />
      </section>

      {/* Deploy diff + commits + PRs (3 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-5">
          <section>
            <SectionHeader title="Deploy diff" />
            <DeployDiff freshness={freshness} />
          </section>
          <section>
            <SectionHeader title="Recent commits on main" subtitle="Last 15" />
            <CommitsFeed commits={commits} deployedSha={freshness?.deployedSha ?? null} />
          </section>
        </div>
        <section>
          <SectionHeader title="Open pull requests" subtitle={`${prs.length} open`} />
          <PrList prs={prs} />
        </section>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex items-baseline justify-between mb-2.5 px-1">
      <div>
        <h2 className="text-[12.5px] font-semibold text-suite-ink">{title}</h2>
        {subtitle && <p className="text-[11px] text-suite-ink-3">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}

function Hero({ repoLink }: { repoLink?: string }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="text-[11px] uppercase tracking-[0.12em] text-suite-ink-3 font-medium inline-flex items-center gap-1.5">
          <GitBranch className="size-3" strokeWidth={2} /> Operations
        </div>
        <h1 className="mt-1 text-[clamp(22px,2.2vw,28px)] leading-tight font-semibold tracking-tight text-suite-ink">
          CI/CD <span style={{ color: "#60B78C" }}>.</span>
        </h1>
        <p className="mt-1 text-[12.5px] text-suite-ink-3 max-w-2xl">
          Live GitHub Actions runs, workflow scorecards, deploy freshness, commits on{" "}
          <code className="text-[11px] bg-suite-card-soft px-1 py-0.5 rounded suite-num">main</code>, and open
          pull requests. Push to main triggers{" "}
          <code className="text-[11px] bg-suite-card-soft px-1 py-0.5 rounded suite-num">deploy.yml</code>.
        </p>
      </div>
      {repoLink && (
        <a
          href={repoLink}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-suite-line bg-white text-[12.5px] text-suite-ink-2 hover:border-suite-line-2 hover:text-suite-ink"
        >
          GitHub Actions <ExternalLink className="size-3" strokeWidth={1.75} />
        </a>
      )}
    </header>
  );
}

function Stat({
  label,
  value,
  tone,
  icon,
  hint,
}: {
  label: string;
  value: string | number;
  tone: "emerald" | "amber" | "rose" | "zinc";
  icon: React.ReactNode;
  hint?: string;
}) {
  const cls =
    tone === "emerald"
      ? { tile: "bg-suite-good-bg ring-suite-good-bg text-suite-good", text: "text-suite-good" }
      : tone === "amber"
        ? { tile: "bg-suite-warn-bg ring-suite-warn-bg text-suite-warn", text: "text-suite-warn" }
        : tone === "rose"
          ? { tile: "bg-suite-dang-bg ring-suite-dang-bg text-suite-dang", text: "text-suite-dang" }
          : { tile: "bg-suite-navy ring-suite-line text-white", text: "text-suite-ink" };
  return (
    <div className="bg-white border border-suite-line rounded-2xl p-4">
      <div
        className={`size-8 rounded-lg inline-flex items-center justify-center ring-1 ${cls.tile}`}
      >
        {icon}
      </div>
      <div className="mt-3 text-[10.5px] uppercase tracking-wide text-suite-ink-3 font-medium">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums suite-num ${cls.text}`}>{value}</div>
      {hint && <div className="text-[11px] text-suite-ink-3 mt-1 truncate">{hint}</div>}
    </div>
  );
}

function formatDuration(sec: number): string {
  if (sec === 0) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
