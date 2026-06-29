"use client";

import { Building2, Check, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createSsoOrgAction } from "@/modules/identity/sso-org-actions";
import type { UserRole } from "@/modules/identity/schema";

const EMPTY = {
  name: "",
  tenantId: "",
  domains: "",
  defaultRole: "user" as UserRole,
};

export function AddOrgForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setOk(false);
    startTransition(async () => {
      const res = await createSsoOrgAction(form);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setOk(true);
      setForm(EMPTY);
      router.refresh();
      setTimeout(() => setOk(false), 2500);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-suite-navy px-3 py-2 text-[13px] font-medium text-white hover:bg-suite-navy-2"
      >
        <Plus className="h-4 w-4" />
        Add org
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-suite-line bg-suite-card-soft p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[13px] font-medium text-suite-ink">
          <Building2 className="h-4 w-4 text-suite-ink-3" />
          Add an SSO org
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="rounded-md p-1 text-suite-ink-4 hover:bg-suite-line-soft hover:text-suite-ink-2"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-suite-ink-3">Org name</span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Acme Corp"
            className="h-9 rounded-md border border-suite-line bg-white px-2.5 text-[13px] text-suite-ink outline-none focus:border-suite-line-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-suite-ink-3">
            Entra tenant ID (GUID)
          </span>
          <input
            type="text"
            value={form.tenantId}
            onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
            placeholder="00000000-0000-0000-0000-000000000000"
            className="h-9 rounded-md border border-suite-line bg-white px-2.5 text-[13px] text-suite-ink outline-none focus:border-suite-line-2 font-mono"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-suite-ink-3">
            Email domains
          </span>
          <input
            type="text"
            value={form.domains}
            onChange={(e) => setForm({ ...form, domains: e.target.value })}
            placeholder="acme.com, acme.onmicrosoft.com"
            className="h-9 rounded-md border border-suite-line bg-white px-2.5 text-[13px] text-suite-ink outline-none focus:border-suite-line-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-suite-ink-3">
            Default role
          </span>
          <select
            value={form.defaultRole}
            onChange={(e) =>
              setForm({ ...form, defaultRole: e.target.value as UserRole })
            }
            className="h-9 rounded-md border border-suite-line bg-white px-2 text-[13px] text-suite-ink outline-none focus:border-suite-line-2"
          >
            <option value="user">User</option>
            <option value="director">Director</option>
            <option value="superadmin">Super admin</option>
          </select>
        </label>
      </div>

      {error ? (
        <div className="mt-3 rounded-md border border-suite-dang/20 bg-suite-dang-bg px-3 py-2 text-[12.5px] text-suite-dang">
          {error}
        </div>
      ) : null}
      {ok ? (
        <div className="mt-3 flex items-center gap-1.5 rounded-md border border-suite-good/20 bg-suite-good-bg px-3 py-2 text-[12.5px] text-suite-good">
          <Check className="h-3.5 w-3.5" />
          Org added.
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-suite-navy px-3 py-2 text-[13px] font-medium text-white hover:bg-suite-navy-2 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {pending ? "Adding…" : "Add org"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="rounded-lg px-3 py-2 text-[13px] text-suite-ink-3 hover:bg-suite-card-soft"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
