"use client";

import { useTransition } from "react";

import {
  setAiAssistantTesterAction,
  setUserRoleAction,
} from "@/modules/identity/admin-actions";
import type { UserRole } from "@/modules/identity/schema";

const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: "Super admin",
  director: "Director",
  user: "User",
};

const ROLE_BADGE: Record<UserRole, string> = {
  superadmin: "bg-suite-warn-bg text-suite-warn border-suite-warn/20",
  director: "bg-suite-good-bg text-suite-good border-suite-good/20",
  user: "bg-suite-neut-bg text-suite-neut border-suite-line",
};

export function UserRow({
  user,
  isSelf,
}: {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: UserRole;
    aiAssistantTester: boolean;
  };
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const onRole = (role: UserRole) =>
    startTransition(() => setUserRoleAction(user.id, role));
  const onTester = (enabled: boolean) =>
    startTransition(() => setAiAssistantTesterAction(user.id, enabled));

  // Superadmins always have the assistant; the toggle only matters for others.
  const assistantOn = user.role === "superadmin" || user.aiAssistantTester;

  return (
    <tr className="border-b border-suite-line-soft last:border-0 hover:bg-suite-card-soft">
      <td className="py-2.5 px-3">
        <div className="text-[13px] font-medium text-suite-ink">
          {user.name ?? "—"}
          {isSelf ? (
            <span className="ml-1.5 text-[10px] font-normal text-suite-ink-4">
              (you)
            </span>
          ) : null}
        </div>
        <div className="text-[11px] text-suite-ink-3 suite-num">
          {user.email}
        </div>
      </td>
      <td className="py-2.5 px-3">
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${ROLE_BADGE[user.role]}`}
        >
          {ROLE_LABELS[user.role]}
        </span>
      </td>
      <td className="py-2.5 px-3">
        <select
          value={user.role}
          disabled={pending || isSelf}
          onChange={(e) => onRole(e.target.value as UserRole)}
          className="h-8 rounded-md border border-suite-line bg-white px-2 text-[12.5px] text-suite-ink-2 outline-none focus:border-suite-line-2 disabled:opacity-50"
          title={isSelf ? "You can't change your own role" : undefined}
        >
          <option value="superadmin">Super admin</option>
          <option value="director">Director</option>
          <option value="user">User</option>
        </select>
      </td>
      <td className="py-2.5 px-3">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={assistantOn}
            disabled={pending || user.role === "superadmin"}
            onChange={(e) => onTester(e.target.checked)}
            className="h-4 w-4 rounded border-suite-line-2 text-suite-navy focus:ring-suite-navy disabled:opacity-50"
          />
          <span className="text-[12px] text-suite-ink-2">
            {user.role === "superadmin"
              ? "Always (superadmin)"
              : assistantOn
                ? "Enabled"
                : "Off"}
          </span>
        </label>
      </td>
    </tr>
  );
}
