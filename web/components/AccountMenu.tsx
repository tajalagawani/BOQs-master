"use client";

// Client-safe account control for the IOX header: shows the signed-in user,
// a superadmin link to Users & Roles, and sign-out. Uses next-auth/react's
// signOut (no SessionProvider needed) and a tiny /api/me fetch for identity —
// so it never pulls server-only code into the shared Header bundle.

import { ChevronDown, KeyRound, LogOut, Shield, User } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

interface Me {
  email: string;
  name: string | null;
  role: "superadmin" | "director" | "user";
}

export function AccountMenu({
  variant = "default",
}: {
  /** "onDark" tunes the trigger (avatar + chevron) for navy surfaces like the
   *  10X suite topnav; the dropdown panel is unchanged. */
  variant?: "default" | "onDark";
} = {}) {
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d?.user) setMe(d.user);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const initial = (me?.name ?? me?.email ?? "?").charAt(0).toUpperCase();
  const roleLabel =
    me?.role === "superadmin"
      ? "Super admin"
      : me?.role === "director"
        ? "Director"
        : "User";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account"
        className={`flex items-center gap-1.5 rounded-full pl-1 pr-1.5 py-1 transition-colors ${
          variant === "onDark" ? "hover:bg-white/10" : "hover:bg-black/5"
        }`}
      >
        <span
          className={`grid place-items-center rounded-full text-[12px] font-semibold text-white ${
            variant === "onDark" ? "h-8 w-8 bg-[#3a5fa0]" : "h-7 w-7 bg-[#142845]"
          }`}
        >
          {initial}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 ${variant === "onDark" ? "text-[#9aa6bd]" : "text-zinc-500"}`}
        />
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-60 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg z-50">
          <div className="px-2.5 py-2">
            <div className="flex items-center gap-1.5 text-[13px] font-medium text-zinc-800">
              <User className="h-3.5 w-3.5 text-zinc-400" />
              {me?.name ?? "Account"}
            </div>
            <div className="mt-0.5 text-[11px] text-zinc-500">{me?.email}</div>
            <div className="mt-1 inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
              {roleLabel}
            </div>
          </div>

          <div className="my-1 h-px bg-zinc-100" />

          {me?.role === "superadmin" ? (
            <Link
              href="/platform/users"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-md px-2.5 py-2 text-[13px] text-zinc-700 hover:bg-zinc-50"
            >
              <Shield className="h-3.5 w-3.5 text-zinc-400" />
              Users &amp; Roles
            </Link>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setPwOpen(true);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-zinc-700 hover:bg-zinc-50"
          >
            <KeyRound className="h-3.5 w-3.5 text-zinc-400" />
            Change password
          </button>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/sign-in" })}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-zinc-700 hover:bg-zinc-50"
          >
            <LogOut className="h-3.5 w-3.5 text-zinc-400" />
            Sign out
          </button>
        </div>
      ) : null}

      {pwOpen ? <ChangePasswordModal onClose={() => setPwOpen(false)} /> : null}
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<
    null | { kind: "err"; msg: string } | { kind: "ok" }
  >(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    if (next.length < 8) {
      setStatus({ kind: "err", msg: "New password must be at least 8 characters." });
      return;
    }
    if (next !== confirm) {
      setStatus({ kind: "err", msg: "New passwords do not match." });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setStatus({ kind: "err", msg: data?.error ?? `Failed (HTTP ${res.status})` });
      } else {
        setStatus({ kind: "ok" });
        setCurrent("");
        setNext("");
        setConfirm("");
        setTimeout(onClose, 1200);
      }
    } catch (err) {
      setStatus({ kind: "err", msg: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const field =
    "w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-zinc-400";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4"
      onMouseDown={onClose}
    >
      <form
        onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl"
      >
        <h2 className="text-[15px] font-semibold text-zinc-900">Change password</h2>
        <p className="mt-1 text-[12px] text-zinc-500">
          Enter your current password and choose a new one (min 8 characters).
        </p>
        <div className="mt-4 space-y-2.5">
          <input
            type="password"
            autoFocus
            placeholder="Current password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={field}
          />
          <input
            type="password"
            placeholder="New password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className={field}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={field}
          />
        </div>
        {status?.kind === "err" ? (
          <p className="mt-2.5 text-[12px] text-red-600">{status.msg}</p>
        ) : null}
        {status?.kind === "ok" ? (
          <p className="mt-2.5 text-[12px] text-emerald-600">Password updated.</p>
        ) : null}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-[13px] text-zinc-600 hover:bg-zinc-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !current || !next || !confirm}
            className="rounded-md bg-zinc-900 px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
          >
            {busy ? "Saving…" : "Update password"}
          </button>
        </div>
      </form>
    </div>
  );
}
