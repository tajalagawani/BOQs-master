import "server-only";

import { Octokit } from "@octokit/rest";
import { getPlatformEnv, githubConfigured } from "./platform-env";

export type RunStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "waiting"
  | "requested"
  | "pending";
export type RunConclusion =
  | "success"
  | "failure"
  | "cancelled"
  | "skipped"
  | "timed_out"
  | "neutral"
  | "action_required"
  | "stale"
  | null;

export interface CiRun {
  id: number;
  name: string;
  displayTitle: string;
  status: RunStatus | string;
  conclusion: RunConclusion;
  event: string;
  branch: string;
  commitSha: string;
  commitMessage: string;
  authorLogin: string | null;
  authorAvatar: string | null;
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
  durationSec: number | null;
  attempt: number;
  workflowId: number;
}

export interface CiStats {
  total: number;
  success: number;
  failure: number;
  inProgress: number;
  avgDurationSec: number;
  latestSuccess?: CiRun;
  latestFailure?: CiRun;
  successRate: number;
}

/**
 * Returns a freshly-built Octokit + the resolved env. Constructing per
 * call (rather than memoizing) means a SUPER_ADMIN rotating GH_TOKEN
 * via /platform/settings takes effect on the next request.
 */
async function gh(): Promise<{ client: Octokit; owner: string; repo: string }> {
  const env = await getPlatformEnv();
  return {
    client: new Octokit({ auth: env.GH_TOKEN }),
    owner: env.GH_OWNER,
    repo: env.GH_REPO,
  };
}

/**
 * Fetch the last N workflow runs for the configured repo. Returns [] when
 * GitHub is not configured — caller renders the credentials-required panel.
 */
export async function listRecentRuns(perPage = 20): Promise<CiRun[]> {
  if (!(await githubConfigured())) return [];
  try {
    const { client, owner, repo } = await gh(); const res = await client.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      per_page: perPage,
    });
    return res.data.workflow_runs.map(toCiRun);
  } catch (err) {
    console.error("[platform/github] listRecentRuns failed", err);
    return [];
  }
}

export async function getCiStats(): Promise<CiStats | null> {
  if (!(await githubConfigured())) return null;
  const runs = await listRecentRuns(30);
  if (runs.length === 0) return { total: 0, success: 0, failure: 0, inProgress: 0, avgDurationSec: 0, successRate: 0 };

  const success = runs.filter((r) => r.conclusion === "success").length;
  const failure = runs.filter((r) => r.conclusion === "failure").length;
  const inProgress = runs.filter((r) => r.status !== "completed").length;
  const completed = runs.filter((r) => r.status === "completed" && r.durationSec != null);
  const avgDurationSec =
    completed.length === 0
      ? 0
      : Math.round(completed.reduce((a, r) => a + (r.durationSec ?? 0), 0) / completed.length);

  return {
    total: runs.length,
    success,
    failure,
    inProgress,
    avgDurationSec,
    latestSuccess: runs.find((r) => r.conclusion === "success"),
    latestFailure: runs.find((r) => r.conclusion === "failure"),
    successRate: Math.round((success / Math.max(1, completed.length)) * 100),
  };
}

export interface CiWorkflow {
  id: number;
  name: string;
  path: string;
  state: string;
  htmlUrl: string;
  badgeUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface CiWorkflowScorecard extends CiWorkflow {
  recent: CiRun[];
  successRate: number;
  avgDurationSec: number;
  lastRun: CiRun | undefined;
}

export interface CiStep {
  name: string;
  status: string;
  conclusion: string | null;
  number: number;
  startedAt?: string;
  completedAt?: string;
  durationSec: number | null;
}

export interface CiJob {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  htmlUrl: string;
  startedAt?: string;
  completedAt?: string;
  durationSec: number | null;
  steps: CiStep[];
  runnerName?: string | null;
  labels: string[];
}

export interface CiAnnotation {
  level: string;
  message: string;
  path: string;
  startLine?: number;
  endLine?: number;
  title?: string;
}

export interface CiArtifact {
  id: number;
  name: string;
  sizeBytes: number;
  expired: boolean;
  expiresAt: string | null;
  archiveDownloadUrl: string;
  createdAt: string;
}

export interface CiCommit {
  sha: string;
  message: string;
  authorLogin: string | null;
  authorName: string | null;
  authorAvatar: string | null;
  authoredAt: string;
  htmlUrl: string;
}

export interface CiDeployFreshness {
  /** SHA currently deployed to production (read from /info endpoint when wired) */
  deployedSha: string | null;
  headSha: string;
  /** Number of commits between deployedSha (excl) and headSha (incl). null if unknown. */
  commitsBehind: number | null;
  pendingCommits: CiCommit[];
}

export interface CiPullRequest {
  number: number;
  title: string;
  state: "open" | "closed";
  draft: boolean;
  authorLogin: string | null;
  authorAvatar: string | null;
  createdAt: string;
  updatedAt: string;
  mergeable: boolean | null;
  mergeableState: string | null;
  baseBranch: string;
  headBranch: string;
  htmlUrl: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  reviewDecision: string | null;
}

/* ---------------------------------------------------------------------------
 * Workflows
 * ------------------------------------------------------------------------- */

export async function listWorkflows(): Promise<CiWorkflow[]> {
  if (!(await githubConfigured())) return [];
  try {
    const { client, owner, repo } = await gh(); const res = await client.actions.listRepoWorkflows({
      owner,
      repo,
      per_page: 100,
    });
    return res.data.workflows.map((w) => ({
      id: w.id,
      name: w.name,
      path: w.path,
      state: w.state,
      htmlUrl: w.html_url,
      badgeUrl: w.badge_url,
      createdAt: w.created_at,
      updatedAt: w.updated_at,
    }));
  } catch (err) {
    console.error("[platform/github] listWorkflows failed", err);
    return [];
  }
}

export async function getWorkflowScorecards(): Promise<CiWorkflowScorecard[]> {
  if (!(await githubConfigured())) return [];
  const workflows = await listWorkflows();
  return Promise.all(
    workflows.map(async (wf) => {
      try {
        const { client, owner, repo } = await gh(); const res = await client.actions.listWorkflowRuns({
          owner,
          repo,
          workflow_id: wf.id,
          per_page: 20,
        });
        const recent = res.data.workflow_runs.map(toCiRun);
        const completed = recent.filter((r) => r.status === "completed");
        const success = completed.filter((r) => r.conclusion === "success").length;
        const durations = completed
          .map((r) => r.durationSec)
          .filter((d): d is number => d != null);
        const avg =
          durations.length === 0
            ? 0
            : Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
        return {
          ...wf,
          recent,
          successRate: completed.length === 0 ? 0 : Math.round((success / completed.length) * 100),
          avgDurationSec: avg,
          lastRun: recent[0],
        };
      } catch {
        return { ...wf, recent: [], successRate: 0, avgDurationSec: 0, lastRun: undefined };
      }
    }),
  );
}

/* ---------------------------------------------------------------------------
 * Single run detail (header + jobs + annotations + artifacts)
 * ------------------------------------------------------------------------- */

export async function getRun(runId: number): Promise<CiRun | null> {
  if (!(await githubConfigured())) return null;
  try {
    const { client, owner, repo } = await gh(); const res = await client.actions.getWorkflowRun({
      owner,
      repo,
      run_id: runId,
    });
    return toCiRun(res.data);
  } catch (err) {
    console.error("[platform/github] getRun failed", err);
    return null;
  }
}

export async function listJobsForRun(runId: number): Promise<CiJob[]> {
  if (!(await githubConfigured())) return [];
  try {
    const { client, owner, repo } = await gh(); const res = await client.actions.listJobsForWorkflowRun({
      owner,
      repo,
      run_id: runId,
      per_page: 100,
    });
    return res.data.jobs.map((j) => {
      const dur =
        j.completed_at && j.started_at
          ? Math.max(
              0,
              Math.round(
                (new Date(j.completed_at).getTime() - new Date(j.started_at).getTime()) / 1000,
              ),
            )
          : null;
      return {
        id: j.id,
        name: j.name,
        status: j.status,
        conclusion: j.conclusion ?? null,
        htmlUrl: j.html_url ?? "",
        startedAt: j.started_at ?? undefined,
        completedAt: j.completed_at ?? undefined,
        durationSec: dur,
        runnerName: j.runner_name ?? null,
        labels: j.labels ?? [],
        steps: (j.steps ?? []).map((s) => {
          const sd =
            s.completed_at && s.started_at
              ? Math.max(
                  0,
                  Math.round(
                    (new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()) /
                      1000,
                  ),
                )
              : null;
          return {
            name: s.name,
            status: s.status,
            conclusion: s.conclusion ?? null,
            number: s.number,
            startedAt: s.started_at ?? undefined,
            completedAt: s.completed_at ?? undefined,
            durationSec: sd,
          };
        }),
      };
    });
  } catch (err) {
    console.error("[platform/github] listJobsForRun failed", err);
    return [];
  }
}

export async function listAnnotationsForRun(runId: number): Promise<CiAnnotation[]> {
  if (!(await githubConfigured())) return [];
  try {
    // Annotations live on check-runs, which are 1:1 with jobs for Actions.
    const jobs = await listJobsForRun(runId);
    const collected: CiAnnotation[] = [];
    for (const job of jobs) {
      try {
        const { client, owner, repo } = await gh(); const res = await client.checks.listAnnotations({
          owner,
          repo,
          check_run_id: job.id,
          per_page: 50,
        });
        for (const a of res.data) {
          collected.push({
            level: a.annotation_level ?? "notice",
            message: a.message ?? "",
            path: a.path ?? "",
            startLine: a.start_line ?? undefined,
            endLine: a.end_line ?? undefined,
            title: a.title ?? undefined,
          });
        }
      } catch {
        /* skip per-job failure */
      }
    }
    return collected;
  } catch (err) {
    console.error("[platform/github] listAnnotationsForRun failed", err);
    return [];
  }
}

export async function listArtifactsForRun(runId: number): Promise<CiArtifact[]> {
  if (!(await githubConfigured())) return [];
  try {
    const { client, owner, repo } = await gh(); const res = await client.actions.listWorkflowRunArtifacts({
      owner,
      repo,
      run_id: runId,
      per_page: 100,
    });
    return res.data.artifacts.map((a) => ({
      id: a.id,
      name: a.name,
      sizeBytes: a.size_in_bytes,
      expired: a.expired,
      expiresAt: a.expires_at ?? null,
      archiveDownloadUrl: a.archive_download_url,
      createdAt: a.created_at ?? "",
    }));
  } catch (err) {
    console.error("[platform/github] listArtifactsForRun failed", err);
    return [];
  }
}

/* ---------------------------------------------------------------------------
 * Commits + deploy diff
 * ------------------------------------------------------------------------- */

export async function listMainCommits(perPage = 20): Promise<CiCommit[]> {
  if (!(await githubConfigured())) return [];
  try {
    const { client, owner, repo } = await gh(); const res = await client.repos.listCommits({
      owner,
      repo,
      sha: "main",
      per_page: perPage,
    });
    return res.data.map((c) => ({
      sha: c.sha,
      message: c.commit.message.split("\n")[0],
      authorLogin: c.author?.login ?? null,
      authorName: c.commit.author?.name ?? null,
      authorAvatar: c.author?.avatar_url ?? null,
      authoredAt: c.commit.author?.date ?? "",
      htmlUrl: c.html_url,
    }));
  } catch (err) {
    console.error("[platform/github] listMainCommits failed", err);
    return [];
  }
}

/**
 * If we know which SHA is on the VM, compute commits-behind. Today we don't
 * publish that from the live VM (would require a `/api/info` endpoint that
 * embeds VERCEL_GIT_COMMIT_SHA / GH_SHA at build), so we approximate using
 * the last successful deploy run's head_sha.
 */
export async function getDeployFreshness(): Promise<CiDeployFreshness | null> {
  if (!(await githubConfigured())) return null;
  try {
    const runs = await listRecentRuns(30);
    const lastDeploy = runs.find(
      (r) => r.name.toLowerCase().includes("deploy") && r.conclusion === "success",
    );
    const { client, owner, repo } = await gh(); const head = await client.repos.getCommit({
      owner,
      repo,
      ref: "main",
    });
    const headSha = head.data.sha;

    if (!lastDeploy) {
      return { deployedSha: null, headSha, commitsBehind: null, pendingCommits: [] };
    }
    if (lastDeploy.commitSha === headSha) {
      return { deployedSha: lastDeploy.commitSha, headSha, commitsBehind: 0, pendingCommits: [] };
    }
    const cmp = await client.repos.compareCommits({
      owner,
      repo,
      base: lastDeploy.commitSha,
      head: headSha,
    });
    const pending: CiCommit[] = cmp.data.commits.map((c) => ({
      sha: c.sha,
      message: c.commit.message.split("\n")[0],
      authorLogin: c.author?.login ?? null,
      authorName: c.commit.author?.name ?? null,
      authorAvatar: c.author?.avatar_url ?? null,
      authoredAt: c.commit.author?.date ?? "",
      htmlUrl: c.html_url,
    }));
    return {
      deployedSha: lastDeploy.commitSha,
      headSha,
      commitsBehind: cmp.data.ahead_by,
      pendingCommits: pending,
    };
  } catch (err) {
    console.error("[platform/github] getDeployFreshness failed", err);
    return null;
  }
}

/* ---------------------------------------------------------------------------
 * Pull requests
 * ------------------------------------------------------------------------- */

export async function listOpenPullRequests(perPage = 10): Promise<CiPullRequest[]> {
  if (!(await githubConfigured())) return [];
  try {
    const { client, owner, repo } = await gh(); const res = await client.pulls.list({
      owner,
      repo,
      state: "open",
      per_page: perPage,
      sort: "updated",
      direction: "desc",
    });
    return res.data.map((p) => ({
      number: p.number,
      title: p.title,
      state: p.state as "open" | "closed",
      draft: p.draft ?? false,
      authorLogin: p.user?.login ?? null,
      authorAvatar: p.user?.avatar_url ?? null,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      mergeable: null,
      mergeableState: null,
      baseBranch: p.base.ref,
      headBranch: p.head.ref,
      htmlUrl: p.html_url,
      additions: 0,
      deletions: 0,
      changedFiles: 0,
      reviewDecision: null,
    }));
  } catch (err) {
    console.error("[platform/github] listOpenPullRequests failed", err);
    return [];
  }
}

/* ---------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */

function toCiRun(run: {
  id: number;
  name: string | null;
  display_title: string;
  status: string | null;
  conclusion: string | null;
  event: string;
  head_branch: string | null;
  head_sha: string;
  head_commit: { message?: string | null } | null;
  actor: { login?: string | null; avatar_url?: string | null } | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_started_at?: string | null;
  run_attempt: number;
  workflow_id: number;
}): CiRun {
  const start = run.run_started_at ?? run.created_at;
  const end = run.updated_at;
  const durationSec =
    run.status === "completed" && start && end
      ? Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000))
      : null;
  return {
    id: run.id,
    name: run.name ?? "workflow",
    displayTitle: run.display_title,
    status: (run.status ?? "completed") as RunStatus,
    conclusion: (run.conclusion ?? null) as RunConclusion,
    event: run.event,
    branch: run.head_branch ?? "—",
    commitSha: run.head_sha,
    commitMessage: run.head_commit?.message ?? run.display_title,
    authorLogin: run.actor?.login ?? null,
    authorAvatar: run.actor?.avatar_url ?? null,
    htmlUrl: run.html_url,
    createdAt: run.created_at,
    updatedAt: run.updated_at,
    durationSec,
    attempt: run.run_attempt,
    workflowId: run.workflow_id,
  };
}
