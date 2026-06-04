"use client";

// Client-safe account control for the IOX header: shows the signed-in user,
// a superadmin link to Users & Roles, and sign-out. Uses next-auth/react's
// signOut (no SessionProvider needed) and a tiny /api/me fetch for identity —
// so it never pulls server-only code into the shared Header bundle.

import { ChevronDown, LogOut, Shield, User } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

interface Me {
  email: string;
  name: string | null;
  role: "superadmin" | "director" | "user";
}

export function AccountMenu() {
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);
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
        className="flex items-center gap-1.5 rounded-full pl-1 pr-1.5 py-1 hover:bg-black/5 transition-colors"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#142845] text-[12px] font-semibold text-white">
          {initial}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
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
            onClick={() => signOut({ callbackUrl: "/sign-in" })}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-zinc-700 hover:bg-zinc-50"
          >
            <LogOut className="h-3.5 w-3.5 text-zinc-400" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
