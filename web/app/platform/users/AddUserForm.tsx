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
        className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-[13px] font-medium text-white hover:bg-zinc-800"
      >
        <Plus className="h-4 w-4" />
        Add user
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[13px] font-medium text-zinc-800">
          <UserPlus className="h-4 w-4 text-zinc-500" />
          Add a user
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="rounded-md p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-zinc-500">Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="name@company.com"
            className="h-9 rounded-md border border-zinc-200 bg-white px-2.5 text-[13px] outline-none focus:border-zinc-400"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-zinc-500">Name</span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Full name"
            className="h-9 rounded-md border border-zinc-200 bg-white px-2.5 text-[13px] outline-none focus:border-zinc-400"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-zinc-500">Role</span>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
            className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-[13px] outline-none focus:border-zinc-400"
          >
            <option value="user">User</option>
            <option value="director">Director</option>
            <option value="superadmin">Super admin</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-zinc-500">
            Temporary password
          </span>
          <input
            type="text"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="they sign in with this"
            className="h-9 rounded-md border border-zinc-200 bg-white px-2.5 text-[13px] outline-none focus:border-zinc-400"
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
          className="h-4 w-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
        />
        <span className="text-[12.5px] text-zinc-600">
          Enable RatesX AI assistant for this user
        </span>
      </label>

      {error ? (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
          {error}
        </div>
      ) : null}
      {ok ? (
        <div className="mt-3 flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-700">
          <Check className="h-3.5 w-3.5" />
          User created.
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-[13px] font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
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
          className="rounded-lg px-3 py-2 text-[13px] text-zinc-500 hover:bg-zinc-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
