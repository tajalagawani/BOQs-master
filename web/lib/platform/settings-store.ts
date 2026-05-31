import "server-only";

import { prisma } from "@/lib/prisma";
import { decrypt, encrypt, maskSecret } from "./secrets";

/**
 * Catalogue of every setting the /platform dashboard recognises. Anything
 * not listed here is rejected by setSetting() — prevents accidentally
 * stashing arbitrary key/value pairs in the table.
 */
export const SETTING_KEYS = [
  "GH_TOKEN",
  "GH_OWNER",
  "GH_REPO",
  "AZURE_TENANT_ID",
  "AZURE_CLIENT_ID",
  "AZURE_CLIENT_SECRET",
  "AZURE_SUBSCRIPTION_ID",
  "AZURE_RESOURCE_GROUP",
  "AZURE_LOG_ANALYTICS_WORKSPACE_ID",
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

export const SECRET_KEYS: SettingKey[] = ["GH_TOKEN", "AZURE_CLIENT_SECRET"];

export interface SettingRow {
  key: SettingKey;
  /** For secrets: redacted (•••• + last 4); for plain values: full plaintext. */
  display: string;
  isSecret: boolean;
  isSet: boolean;
  updatedAt?: string;
  updatedBy?: string | null;
}

export interface ResolvedSettings {
  GH_TOKEN: string;
  GH_OWNER: string;
  GH_REPO: string;
  AZURE_TENANT_ID: string;
  AZURE_CLIENT_ID: string;
  AZURE_CLIENT_SECRET: string;
  AZURE_SUBSCRIPTION_ID: string;
  AZURE_RESOURCE_GROUP: string;
  AZURE_LOG_ANALYTICS_WORKSPACE_ID: string;
  /** Per-key source ("db" if overridden by DB, else "env"). For diagnostics. */
  __sources: Partial<Record<SettingKey, "db" | "env" | "default">>;
}

const DEFAULTS: Record<SettingKey, string> = {
  GH_TOKEN: "",
  GH_OWNER: "tajalagawani",
  GH_REPO: "BOQs-master",
  AZURE_TENANT_ID: "5c1c05b1-7b56-45e5-b38e-c9aea88f4588",
  AZURE_CLIENT_ID: "",
  AZURE_CLIENT_SECRET: "",
  AZURE_SUBSCRIPTION_ID: "5d5e49c7-1fe0-4d54-827b-57844c2dd0aa",
  AZURE_RESOURCE_GROUP: "iox-rg",
  AZURE_LOG_ANALYTICS_WORKSPACE_ID: "4e6790de-67ab-457c-9a8c-aa06e23e0777",
};

/**
 * Compute the effective settings for runtime use. Precedence (highest first):
 *   1. DB row    (set via /platform/settings UI)
 *   2. process.env
 *   3. Built-in default (only for non-secret IDs like tenant/sub)
 */
export async function resolvePlatformSettings(): Promise<ResolvedSettings> {
  const dbRows = await prisma.platformSetting.findMany();
  const dbMap = new Map<string, { value: string; isSecret: boolean }>();
  for (const r of dbRows) {
    try {
      const v = r.isSecret ? decrypt(r.value) : r.value;
      dbMap.set(r.key, { value: v, isSecret: r.isSecret });
    } catch {
      // If decryption fails (e.g. SETTINGS_ENCRYPTION_KEY rotated), skip
      // that row rather than crash the page.
    }
  }

  const out = {} as ResolvedSettings;
  out.__sources = {};
  for (const k of SETTING_KEYS) {
    const db = dbMap.get(k);
    if (db && db.value) {
      out[k] = db.value;
      out.__sources![k] = "db";
    } else if (process.env[k]) {
      out[k] = process.env[k] as string;
      out.__sources![k] = "env";
    } else {
      out[k] = DEFAULTS[k];
      out.__sources![k] = "default";
    }
  }
  return out;
}

/** Settings list for the UI — secrets are masked. */
export async function listSettingsForAdmin(): Promise<SettingRow[]> {
  const dbRows = await prisma.platformSetting.findMany();
  const dbMap = new Map(dbRows.map((r) => [r.key, r]));

  return SETTING_KEYS.map((k) => {
    const row = dbMap.get(k);
    const isSecret = SECRET_KEYS.includes(k);
    let displayValue = "";
    let isSet = false;
    if (row) {
      try {
        const v = row.isSecret ? decrypt(row.value) : row.value;
        displayValue = isSecret ? maskSecret(v) : v;
        isSet = v.length > 0;
      } catch {
        displayValue = "(decrypt failed)";
      }
    } else if (process.env[k]) {
      const v = process.env[k] as string;
      displayValue = isSecret ? maskSecret(v) : v;
      isSet = v.length > 0;
    } else {
      displayValue = DEFAULTS[k];
      isSet = DEFAULTS[k].length > 0;
    }
    return {
      key: k,
      display: displayValue,
      isSecret,
      isSet,
      updatedAt: row?.updatedAt?.toISOString(),
      updatedBy: row?.updatedBy ?? null,
    };
  });
}

export async function setSetting(
  key: SettingKey,
  value: string,
  updatedBy: string | null,
): Promise<void> {
  if (!SETTING_KEYS.includes(key)) {
    throw new Error(`Unknown setting key: ${key}`);
  }
  const isSecret = SECRET_KEYS.includes(key);
  const stored = isSecret ? encrypt(value) : value;
  await prisma.platformSetting.upsert({
    where: { key },
    create: { key, value: stored, isSecret, updatedBy },
    update: { value: stored, isSecret, updatedBy },
  });
}

export async function clearSetting(key: SettingKey): Promise<void> {
  if (!SETTING_KEYS.includes(key)) {
    throw new Error(`Unknown setting key: ${key}`);
  }
  await prisma.platformSetting.delete({ where: { key } }).catch(() => {
    /* row may not exist — that's fine, the goal is "no row" */
  });
}
