"use server";

import { revalidatePath } from "next/cache";
import { Octokit } from "@octokit/rest";
import { ResourceManagementClient } from "@azure/arm-resources";
import { LogsQueryClient, Durations } from "@azure/monitor-query";
import {
  ClientSecretCredential,
  DefaultAzureCredential,
  type TokenCredential,
} from "@azure/identity";
import { getPlatformUser, requirePlatformAccess } from "@/lib/platform/auth";
import {
  setSetting,
  clearSetting,
  SETTING_KEYS,
  SECRET_KEYS,
  type SettingKey,
} from "@/lib/platform/settings-store";
import { getPlatformEnv } from "@/lib/platform/platform-env";

export interface SaveResult {
  ok: boolean;
  saved: SettingKey[];
  cleared: SettingKey[];
  errors: string[];
}

const MASK_PREFIX = "•";

/**
 * Persist a batch of settings from the form. Empty strings clear the
 * row entirely (so the env-var / default takes over). The literal
 * masked value (•••• …) means "no change" and is skipped.
 */
export async function saveSettings(formData: FormData): Promise<SaveResult> {
  const user = await requirePlatformAccess();
  const updatedBy = user.email ?? user.id;
  const saved: SettingKey[] = [];
  const cleared: SettingKey[] = [];
  const errors: string[] = [];

  for (const key of SETTING_KEYS) {
    const raw = formData.get(key);
    if (raw === null) continue;
    const value = String(raw);
    // If user left a masked value untouched, skip.
    if (SECRET_KEYS.includes(key) && value.startsWith(MASK_PREFIX)) continue;
    try {
      if (value === "") {
        await clearSetting(key);
        cleared.push(key);
      } else {
        await setSetting(key, value, updatedBy);
        saved.push(key);
      }
    } catch (e) {
      errors.push(`${key}: ${(e as Error).message}`);
    }
  }
  revalidatePath("/platform/settings");
  revalidatePath("/platform/cicd");
  revalidatePath("/platform/monitoring");
  revalidatePath("/platform/infrastructure");
  return { ok: errors.length === 0, saved, cleared, errors };
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
  detail?: string;
}

/** Ping the GitHub API with the currently-resolved token. */
export async function testGithubConnection(): Promise<ConnectionTestResult> {
  await requirePlatformAccess();
  const env = await getPlatformEnv();
  if (!env.GH_TOKEN) {
    return { ok: false, message: "No GitHub token configured", detail: "Set GH_TOKEN first" };
  }
  try {
    const client = new Octokit({ auth: env.GH_TOKEN });
    const me = await client.users.getAuthenticated();
    const repo = await client.repos.get({ owner: env.GH_OWNER, repo: env.GH_REPO });
    return {
      ok: true,
      message: `Connected as ${me.data.login}`,
      detail: `Repo: ${repo.data.full_name} · ${repo.data.private ? "private" : "public"}`,
    };
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return {
      ok: false,
      message: `GitHub API ${err.status ?? "?"}: ${err.message ?? "unknown"}`,
    };
  }
}

/** List resources in the configured RG with the currently-resolved Azure creds. */
export async function testAzureConnection(): Promise<ConnectionTestResult> {
  await requirePlatformAccess();
  const env = await getPlatformEnv();
  if (!env.AZURE_SUBSCRIPTION_ID) {
    return { ok: false, message: "AZURE_SUBSCRIPTION_ID not set" };
  }
  try {
    const cred = pickAzureCredential(env);
    const client = new ResourceManagementClient(cred, env.AZURE_SUBSCRIPTION_ID);
    let count = 0;
    for await (const _ of client.resources.listByResourceGroup(env.AZURE_RESOURCE_GROUP)) count++;
    const usingSp = Boolean(
      env.AZURE_TENANT_ID && env.AZURE_CLIENT_ID && env.AZURE_CLIENT_SECRET,
    );
    return {
      ok: true,
      message: `Connected to ${env.AZURE_RESOURCE_GROUP}`,
      detail: `${count} resources visible · auth: ${usingSp ? "service principal" : "DefaultAzureCredential (CLI/MI)"}`,
    };
  } catch (e) {
    const err = e as { code?: string; message?: string };
    return {
      ok: false,
      message: `Azure: ${err.code ?? "error"}`,
      detail: (err.message ?? "").split("\n")[0],
    };
  }
}

/** Issue a tiny Kusto query to verify Log Analytics access. */
export async function testLogAnalyticsConnection(): Promise<ConnectionTestResult> {
  await requirePlatformAccess();
  const env = await getPlatformEnv();
  if (!env.AZURE_LOG_ANALYTICS_WORKSPACE_ID) {
    return { ok: false, message: "AZURE_LOG_ANALYTICS_WORKSPACE_ID not set" };
  }
  try {
    const cred = pickAzureCredential(env);
    const client = new LogsQueryClient(cred);
    const res = await client.queryWorkspace(
      env.AZURE_LOG_ANALYTICS_WORKSPACE_ID,
      "Heartbeat | take 1 | project TimeGenerated",
      { duration: Durations.oneDay },
    );
    const rows = res.tables?.[0]?.rows ?? [];
    return {
      ok: true,
      message: rows.length > 0 ? "Workspace responding" : "Workspace responding (no Heartbeat data yet)",
      detail: `Workspace ${env.AZURE_LOG_ANALYTICS_WORKSPACE_ID.slice(0, 8)}… reachable`,
    };
  } catch (e) {
    const err = e as { code?: string; message?: string };
    return {
      ok: false,
      message: `Log Analytics: ${err.code ?? "error"}`,
      detail: (err.message ?? "").split("\n")[0],
    };
  }
}

function pickAzureCredential(env: Awaited<ReturnType<typeof getPlatformEnv>>): TokenCredential {
  if (env.AZURE_TENANT_ID && env.AZURE_CLIENT_ID && env.AZURE_CLIENT_SECRET) {
    return new ClientSecretCredential(
      env.AZURE_TENANT_ID,
      env.AZURE_CLIENT_ID,
      env.AZURE_CLIENT_SECRET,
    );
  }
  return new DefaultAzureCredential({
    tenantId: env.AZURE_TENANT_ID || undefined,
  });
}

/** Best-effort: who I am, for telemetry display only. */
export async function whoamiForSettings() {
  const user = await getPlatformUser();
  return user;
}
