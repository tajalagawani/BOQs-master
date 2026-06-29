"use client";

import { Lock, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  deleteSsoOrgAction,
  setSsoOrgEnabledAction,
  updateSsoOrgAction,
} from "@/modules/identity/sso-org-actions";
import type { UserRole } from "@/modules/identity/schema";

type OrgView = {
  id: string;
  tenantId: string;
  name: string;
  allowedEmailDomains: string[];
  defaultRole: UserRole;
  enabled: boolean;
  isPrimary: boolean;
};

export function OrgRow({ org }: { org: OrgView }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: true } | { error: string }>) {
    setErr(null);
    startTransition(async () => {
      const res = await fn();
      if ("error" in res) {
        setErr(res.error);
        return;
      }
      router.refresh();
    });
  }

  function changeRole(role: UserRole) {
    run(() =>
      updateSsoOrgAction(org.id, {
        name: org.name,
        domains: org.allowedEmailDomains.join(", "),
        defaultRole: role,
      }),
    );
  }

  return (
    <tr className="align-top">
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-1.5 font-medium text-suite-ink">
          {org.name}
          {org.isPrimary ? (
            <span
              title="Primary org — locked"
              className="inline-flex items-center gap-1 rounded bg-suite-line-soft px-1.5 py-0.5 text-[10px] font-medium text-suite-ink-3"
            >
              <Lock className="h-3 w-3" />
              Primary
            </span>
          ) : null}
        </div>
        {err ? <div className="mt-1 text-[11px] text-suite-dang">{err}</div> : null}
      </td>

      <td className="py-2.5 px-3">
        <span className="font-mono text-[11px] text-suite-ink-3">
          {org.tenantId}
        </span>
      </td>

      <td className="py-2.5 px-3 text-[12.5px] text-suite-ink-2">
        {org.allowedEmailDomains.length
          ? org.allowedEmailDomains.join(", ")
          : "—"}
      </td>

      <td className="py-2.5 px-3">
        <select
          value={org.defaultRole}
          disabled={pending || org.isPrimary}
          onChange={(e) => changeRole(e.target.value as UserRole)}
          className="h-8 rounded-md border border-suite-line bg-white px-2 text-[12.5px] text-suite-ink outline-none focus:border-suite-line-2 disabled:opacity-60"
        >
          <option value="user">User</option>
          <option value="director">Director</option>
          <option value="superadmin">Super admin</option>
        </select>
      </td>

      <td className="py-2.5 px-3">
        <button
          type="button"
          disabled={pending || org.isPrimary}
          onClick={() => run(() => setSsoOrgEnabledAction(org.id, !org.enabled))}
          className={
            "rounded-full px-2.5 py-1 text-[11px] font-medium disabled:opacity-60 " +
            (org.enabled
              ? "bg-suite-good-bg text-suite-good"
              : "bg-suite-line-soft text-suite-ink-3")
          }
        >
          {org.enabled ? "Enabled" : "Disabled"}
        </button>
      </td>

      <td className="py-2.5 px-3 text-right">
        {org.isPrimary ? null : (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (
                confirm(`Remove "${org.name}"? Its users will no longer be able to sign in.`)
              ) {
                run(() => deleteSsoOrgAction(org.id));
              }
            }}
            className="rounded-md p-1.5 text-suite-ink-4 hover:bg-suite-dang-bg hover:text-suite-dang disabled:opacity-50"
            aria-label="Remove org"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </td>
    </tr>
  );
}
