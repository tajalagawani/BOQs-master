export const dynamic = "force-dynamic";

import { Settings, ShieldCheck } from "lucide-react";
import { requirePlatformAccess } from "@/lib/platform/auth";
import { listSettingsForAdmin } from "@/lib/platform/settings-store";
import { SettingsForm } from "@/components/platform/SettingsForm";

export default async function SettingsPage() {
  const user = await requirePlatformAccess();
  const rows = await listSettingsForAdmin();

  return (
    <div className="suite mx-auto max-w-4xl p-4 px-6 py-6 space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-suite-ink-3 font-medium inline-flex items-center gap-1.5">
            <Settings className="size-3" strokeWidth={2} /> Administration
          </div>
          <h1 className="mt-1 text-[clamp(22px,2.2vw,28px)] leading-tight font-semibold tracking-tight text-suite-ink">
            Platform settings <span style={{ color: "#60B78C" }}>.</span>
          </h1>
          <p className="mt-1 text-[12.5px] text-suite-ink-2 max-w-2xl">
            Configure the GitHub + Azure credentials that power the CI/CD,
            Infrastructure, and Monitoring tabs. Saved values are
            AES-256-GCM encrypted at rest and take effect on the next
            request — no redeploy required.
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10.5px] uppercase tracking-wide text-suite-ink-3 font-medium">
            Signed in as
          </div>
          <div className="text-[12.5px] font-medium text-suite-ink">{user.name}</div>
          <div className="text-[11px] text-suite-ink-2 inline-flex items-center gap-1">
            <ShieldCheck className="size-2.5 text-suite-good" strokeWidth={2} />
            {user.role}
          </div>
        </div>
      </header>

      <div className="bg-suite-warn-bg border border-suite-line rounded-2xl px-4 py-3 text-[11.5px] text-suite-warn">
        <strong className="font-semibold">Heads up:</strong> Settings saved here
        override the corresponding <code className="suite-num text-[11px] bg-suite-card-soft rounded px-1 py-0.5">.env</code>{" "}
        values. To revert to env vars, clear the field and save.
      </div>

      <SettingsForm rows={rows} />

      <p className="text-[10.5px] text-suite-ink-3 text-center">
        Secrets are encrypted with AES-256-GCM using a key derived (scrypt) from{" "}
        <code className="suite-num text-[10px] bg-suite-card-soft rounded px-1 py-0.5">SETTINGS_ENCRYPTION_KEY</code>{" "}
        (or <code className="suite-num text-[10px] bg-suite-card-soft rounded px-1 py-0.5">AUTH_SECRET</code> as fallback).
      </p>
    </div>
  );
}
