import "server-only";

import { resolvePlatformSettings, type ResolvedSettings } from "./settings-store";

/**
 * Resolve platform integration settings (DB row > env var > built-in default).
 *
 * Every consumer that talks to GitHub or Azure must call this each request
 * — DB overrides happen at runtime, so a SUPER_ADMIN can rotate creds via
 * `/platform/settings` without restarting the server.
 *
 * For static defaults / display purposes (e.g. the hero on the CI/CD page),
 * use `platformEnvSync` — it reads from process.env only and never blocks.
 */
export async function getPlatformEnv(): Promise<ResolvedSettings> {
  return resolvePlatformSettings();
}

export async function githubConfigured(): Promise<boolean> {
  const e = await getPlatformEnv();
  return Boolean(e.GH_TOKEN && e.GH_OWNER && e.GH_REPO);
}

export async function azureConfigured(): Promise<boolean> {
  const e = await getPlatformEnv();
  return Boolean(e.AZURE_SUBSCRIPTION_ID);
}

export async function logAnalyticsConfigured(): Promise<boolean> {
  const e = await getPlatformEnv();
  return Boolean(e.AZURE_SUBSCRIPTION_ID && e.AZURE_LOG_ANALYTICS_WORKSPACE_ID);
}

export async function hasSpCredentials(): Promise<boolean> {
  const e = await getPlatformEnv();
  return Boolean(e.AZURE_TENANT_ID && e.AZURE_CLIENT_ID && e.AZURE_CLIENT_SECRET);
}

/**
 * Synchronous snapshot read straight from process.env. Useful for static
 * link/repo references in components; never used for auth.
 */
export const platformEnvSync = {
  GH_OWNER: process.env.GH_OWNER ?? "tajalagawani",
  GH_REPO: process.env.GH_REPO ?? "BOQs-master",
  AZURE_TENANT_ID: process.env.AZURE_TENANT_ID ?? "5c1c05b1-7b56-45e5-b38e-c9aea88f4588",
  AZURE_SUBSCRIPTION_ID:
    process.env.AZURE_SUBSCRIPTION_ID ?? "5d5e49c7-1fe0-4d54-827b-57844c2dd0aa",
  AZURE_RESOURCE_GROUP: process.env.AZURE_RESOURCE_GROUP ?? "iox-rg",
  AZURE_LOG_ANALYTICS_WORKSPACE_ID:
    process.env.AZURE_LOG_ANALYTICS_WORKSPACE_ID ??
    "4e6790de-67ab-457c-9a8c-aa06e23e0777",
};
