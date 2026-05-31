import "server-only";

import {
  ClientSecretCredential,
  DefaultAzureCredential,
  type TokenCredential,
} from "@azure/identity";
import { ResourceManagementClient } from "@azure/arm-resources";
import { ComputeManagementClient } from "@azure/arm-compute";
import { NetworkManagementClient } from "@azure/arm-network";
import { LogsQueryClient } from "@azure/monitor-query";
import { getPlatformEnv } from "./platform-env";
import type { ResolvedSettings } from "./settings-store";

/**
 * Resolve a TokenCredential via the first path that works:
 *   1. Service principal env vars (AZURE_CLIENT_ID/SECRET set via UI or env)
 *   2. DefaultAzureCredential — tries Managed Identity (when running on
 *      Azure with system-assigned MI), then Azure CLI cached session
 *      (`az login`) locally.
 *
 * Clients are constructed per-call rather than memoized so that a
 * credential rotation via the /platform/settings UI takes effect on
 * the very next request — no restart required.
 */
function credentialFor(env: ResolvedSettings): TokenCredential {
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

export async function resourceClient(): Promise<ResourceManagementClient> {
  const env = await getPlatformEnv();
  return new ResourceManagementClient(credentialFor(env), env.AZURE_SUBSCRIPTION_ID);
}

export async function computeClient(): Promise<ComputeManagementClient> {
  const env = await getPlatformEnv();
  return new ComputeManagementClient(credentialFor(env), env.AZURE_SUBSCRIPTION_ID);
}

export async function networkClient(): Promise<NetworkManagementClient> {
  const env = await getPlatformEnv();
  return new NetworkManagementClient(credentialFor(env), env.AZURE_SUBSCRIPTION_ID);
}

export async function logsClient(): Promise<LogsQueryClient> {
  const env = await getPlatformEnv();
  return new LogsQueryClient(credentialFor(env));
}
