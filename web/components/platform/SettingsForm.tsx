"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  saveSettings,
  testGithubConnection,
  testAzureConnection,
  testLogAnalyticsConnection,
  type SaveResult,
  type ConnectionTestResult,
} from "@/lib/platform/settings-actions";
import type { SettingRow } from "@/lib/platform/settings-store";

interface Props {
  rows: SettingRow[];
}

type SectionKey = "github" | "azure" | "logs";

const SECTIONS: {
  key: SectionKey;
  title: string;
  description: string;
  fields: { key: string; label: string; hint?: string; placeholder?: string }[];
  test: () => Promise<ConnectionTestResult>;
}[] = [
  {
    key: "github",
    title: "GitHub",
    description:
      "Read-only Personal Access Token used by /platform/cicd to surface workflow runs, commits, PRs, and deploy diff.",
    fields: [
      {
        key: "GH_TOKEN",
        label: "Personal Access Token",
        hint: "Fine-grained PAT with actions:read + metadata:read + pull_requests:read + contents:read",
        placeholder: "github_pat_…",
      },
      { key: "GH_OWNER", label: "Owner", hint: "Repository owner / org login", placeholder: "tajalagawani" },
      { key: "GH_REPO", label: "Repository", hint: "Repository name", placeholder: "BOQs-master" },
    ],
    test: testGithubConnection,
  },
  {
    key: "azure",
    title: "Azure",
    description:
      "Service principal credentials used by /platform/infrastructure (Resource Manager) and /platform/monitoring (Log Analytics). Leave Client ID / Secret empty to use Managed Identity (on Azure VM) or your local az CLI session.",
    fields: [
      { key: "AZURE_TENANT_ID", label: "Tenant ID", placeholder: "00000000-0000-0000-0000-000000000000" },
      { key: "AZURE_SUBSCRIPTION_ID", label: "Subscription ID", placeholder: "00000000-…" },
      { key: "AZURE_CLIENT_ID", label: "Client ID (App ID)", placeholder: "Optional — leave blank for MI/CLI" },
      { key: "AZURE_CLIENT_SECRET", label: "Client Secret", placeholder: "Optional — paste once, never re-displayed" },
      { key: "AZURE_RESOURCE_GROUP", label: "Resource group", placeholder: "iox-rg" },
    ],
    test: testAzureConnection,
  },
  {
    key: "logs",
    title: "Log Analytics",
    description:
      "Workspace GUID for Kusto queries on /platform/monitoring. The service principal (or MI) above also needs Log Analytics Reader on this workspace.",
    fields: [
      {
        key: "AZURE_LOG_ANALYTICS_WORKSPACE_ID",
        label: "Workspace ID",
        hint: "Customer ID (GUID), NOT the full /subscriptions/… path",
        placeholder: "00000000-0000-0000-0000-000000000000",
      },
    ],
    test: testLogAnalyticsConnection,
  },
];

export function SettingsForm({ rows }: Props) {
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return (
    <div className="space-y-5">
      {SECTIONS.map((s) => (
        <Section key={s.key} section={s} byKey={byKey} />
      ))}
    </div>
  );
}

function Section({
  section,
  byKey,
}: {
  section: (typeof SECTIONS)[number];
  byKey: Map<string, SettingRow>;
}) {
  const [saving, startSave] = useTransition();
  const [testing, startTest] = useTransition();
  const [result, setResult] = useState<SaveResult | null>(null);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  async function onSubmit(form: FormData) {
    startSave(async () => {
      const r = await saveSettings(form);
      setResult(r);
      setTestResult(null);
    });
  }

  function onTest() {
    startTest(async () => {
      const r = await section.test();
      setTestResult(r);
    });
  }

  return (
    <section className="bg-white border border-zinc-200 rounded-2xl p-5">
      <header className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold text-zinc-900">{section.title}</h2>
          <p className="mt-0.5 text-[12px] text-zinc-500 leading-relaxed max-w-3xl">
            {section.description}
          </p>
        </div>
        <button
          type="button"
          onClick={onTest}
          disabled={testing}
          className="h-8 px-3 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white text-[11.5px] font-medium text-zinc-700 hover:border-zinc-300 hover:text-zinc-900 disabled:opacity-50 shrink-0"
        >
          {testing ? (
            <Loader2 className="size-3 animate-spin" strokeWidth={2} />
          ) : (
            <RefreshCw className="size-3" strokeWidth={2} />
          )}
          Test connection
        </button>
      </header>

      {testResult && (
        <div
          className={cn(
            "mb-4 px-3 py-2 rounded-md border text-[12px] flex items-start gap-2",
            testResult.ok
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900",
          )}
        >
          {testResult.ok ? (
            <CheckCircle2 className="size-3.5 shrink-0 mt-0.5" strokeWidth={2} />
          ) : (
            <XCircle className="size-3.5 shrink-0 mt-0.5" strokeWidth={2} />
          )}
          <div className="min-w-0">
            <div className="font-medium">{testResult.message}</div>
            {testResult.detail && (
              <div className="mt-0.5 text-[11px] opacity-80">{testResult.detail}</div>
            )}
          </div>
        </div>
      )}

      <form action={onSubmit} className="space-y-3">
        {section.fields.map((f) => {
          const row = byKey.get(f.key);
          const isSecret = row?.isSecret ?? false;
          const inputType = isSecret && !revealed[f.key] ? "password" : "text";
          return (
            <div key={f.key} className="grid grid-cols-1 md:grid-cols-[180px,1fr] gap-2 md:gap-4 items-start">
              <div className="md:pt-2">
                <label htmlFor={f.key} className="text-[12px] font-medium text-zinc-800">
                  {f.label}
                </label>
                {f.hint && (
                  <p className="text-[10.5px] text-zinc-500 mt-0.5 leading-snug">{f.hint}</p>
                )}
              </div>
              <div className="relative">
                <input
                  id={f.key}
                  name={f.key}
                  type={inputType}
                  defaultValue={row?.display ?? ""}
                  placeholder={f.placeholder}
                  autoComplete="off"
                  spellCheck={false}
                  className={cn(
                    "w-full h-9 px-3 text-[12.5px] bg-zinc-50 border border-zinc-200 rounded-md",
                    "placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400",
                    isSecret && "font-mono",
                  )}
                />
                {isSecret && (
                  <button
                    type="button"
                    onClick={() => setRevealed((p) => ({ ...p, [f.key]: !p[f.key] }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 size-6 inline-flex items-center justify-center text-zinc-400 hover:text-zinc-700"
                    aria-label={revealed[f.key] ? "Hide" : "Reveal"}
                  >
                    {revealed[f.key] ? (
                      <EyeOff className="size-3.5" strokeWidth={1.75} />
                    ) : (
                      <Eye className="size-3.5" strokeWidth={1.75} />
                    )}
                  </button>
                )}
                <div className="mt-1 flex items-center gap-2 text-[10.5px]">
                  <StatusBadge row={row} />
                  {row?.updatedAt && (
                    <span className="text-zinc-400">
                      Updated {new Date(row.updatedAt).toLocaleString()}
                      {row.updatedBy ? ` · by ${row.updatedBy}` : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div className="flex items-center gap-3 pt-2 border-t border-zinc-100">
          <button
            type="submit"
            disabled={saving}
            className="h-9 px-4 inline-flex items-center gap-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white text-[12.5px] font-medium disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="size-3 animate-spin" strokeWidth={2} />
            ) : (
              <Save className="size-3" strokeWidth={2} />
            )}
            Save changes
          </button>
          {result && (
            <div
              className={cn(
                "text-[11.5px]",
                result.ok ? "text-emerald-700" : "text-rose-700",
              )}
            >
              {result.ok
                ? `Saved ${result.saved.length} · cleared ${result.cleared.length}`
                : result.errors.join(", ")}
            </div>
          )}
          <p className="ml-auto text-[10.5px] text-zinc-400">
            Empty field → clears the override (env / default re-takes effect)
          </p>
        </div>
      </form>
    </section>
  );
}

function StatusBadge({ row }: { row?: SettingRow }) {
  if (!row || !row.isSet) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 ring-1 ring-zinc-200 text-zinc-600 px-1.5 h-4.5 font-medium">
        empty
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 ring-1 ring-emerald-200 text-emerald-700 px-1.5 h-4.5 font-medium">
      set
    </span>
  );
}
