export const dynamic = "force-dynamic";

import { Settings, ShieldCheck } from "lucide-react";
import { requirePlatformAccess } from "@/lib/platform/auth";
import { listSettingsForAdmin } from "@/lib/platform/settings-store";
import { SettingsForm } from "@/components/platform/SettingsForm";

export default async function SettingsPage() {
  const user = await requirePlatformAccess();
  const rows = await listSettingsForAdmin();

  return (
    <div className="mx-auto max-w-4xl px-6 py-6 space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-500 font-medium inline-flex items-center gap-1.5">
            <Settings className="size-3" strokeWidth={2} /> Administration
          </div>
          <h1 className="mt-1 text-[clamp(22px,2.2vw,28px)] leading-tight font-semibold tracking-tight text-zinc-900">
            Platform settings <span style={{ color: "#60B78C" }}>.</span>
          </h1>
          <p className="mt-1 text-[12.5px] text-zinc-500 max-w-2xl">
            Configure the GitHub + Azure credentials that power the CI/CD,
            Infrastructure, and Monitoring tabs. Saved values are
            AES-256-GCM encrypted at rest and take effect on the next
            request — no redeploy required.
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10.5px] uppercase tracking-wide text-zinc-400 font-medium">
            Signed in as
          </div>
          <div className="text-[12.5px] font-medium text-zinc-900">{user.name}</div>
          <div className="text-[11px] text-zinc-500 inline-flex items-center gap-1">
            <ShieldCheck className="size-2.5 text-emerald-600" strokeWidth={2} />
            {user.role}
          </div>
        </div>
      </header>

      <div className="bg-amber-50/40 border border-amber-100 rounded-2xl px-4 py-3 text-[11.5px] text-amber-900">
        <strong className="font-semibold">Heads up:</strong> Settings saved here
        override the corresponding <code className="text-[11px] bg-amber-100 rounded px-1 py-0.5">.env</code>{" "}
        values. To revert to env vars, clear the field and save.
      </div>

      <SettingsForm rows={rows} />

      <p className="text-[10.5px] text-zinc-400 text-center">
        Secrets are encrypted with AES-256-GCM using a key derived (scrypt) from{" "}
        <code className="text-[10px] bg-zinc-100 rounded px-1 py-0.5">SETTINGS_ENCRYPTION_KEY</code>{" "}
        (or <code className="text-[10px] bg-zinc-100 rounded px-1 py-0.5">AUTH_SECRET</code> as fallback).
      </p>
    </div>
  );
}
