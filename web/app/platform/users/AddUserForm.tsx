"use client";

import { Check, Plus, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createUserAction } from "@/modules/identity/admin-actions";
import type { UserRole } from "@/modules/identity/schema";

const EMPTY = {
  email: "",
  name: "",
  role: "user" as UserRole,
  aiAssistantTester: false,
  password: "",
};

export function AddUserForm() {
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
      const res = await createUserAction(form);
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
        Add user
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-suite-line bg-suite-card-soft p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[13px] font-medium text-suite-ink">
          <UserPlus className="h-4 w-4 text-suite-ink-3" />
          Add a user
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
          <span className="text-[11px] font-medium text-suite-ink-3">Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="name@company.com"
            className="h-9 rounded-md border border-suite-line bg-white px-2.5 text-[13px] text-suite-ink outline-none focus:border-suite-line-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-suite-ink-3">Name</span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Full name"
            className="h-9 rounded-md border border-suite-line bg-white px-2.5 text-[13px] text-suite-ink outline-none focus:border-suite-line-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-suite-ink-3">Role</span>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
            className="h-9 rounded-md border border-suite-line bg-white px-2 text-[13px] text-suite-ink outline-none focus:border-suite-line-2"
          >
            <option value="user">User</option>
            <option value="director">Director</option>
            <option value="superadmin">Super admin</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-suite-ink-3">
            Temporary password
          </span>
          <input
            type="text"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="they sign in with this"
            className="h-9 rounded-md border border-suite-line bg-white px-2.5 text-[13px] text-suite-ink outline-none focus:border-suite-line-2"
          />
        </label>
      </div>

      <label className="mt-3 inline-flex cursor-pointer items-center gap-2 select-none">
        <input
          type="checkbox"
          checked={form.aiAssistantTester}
          onChange={(e) =>
            setForm({ ...form, aiAssistantTester: e.target.checked })
          }
          className="h-4 w-4 rounded border-suite-line-2 text-suite-navy focus:ring-suite-navy"
        />
        <span className="text-[12.5px] text-suite-ink-2">
          Enable ioInsight AI assistant for this user
        </span>
      </label>

      {error ? (
        <div className="mt-3 rounded-md border border-suite-dang/20 bg-suite-dang-bg px-3 py-2 text-[12.5px] text-suite-dang">
          {error}
        </div>
      ) : null}
      {ok ? (
        <div className="mt-3 flex items-center gap-1.5 rounded-md border border-suite-good/20 bg-suite-good-bg px-3 py-2 text-[12.5px] text-suite-good">
          <Check className="h-3.5 w-3.5" />
          User created.
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
          {pending ? "Creating…" : "Create user"}
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
