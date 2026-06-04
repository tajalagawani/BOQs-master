import { requireSuperadmin } from "@/modules/core/authz";
import { listAllUsers } from "@/modules/identity/queries";

import { AddUserForm } from "./AddUserForm";
import { UserRow } from "./UserRow";

export const dynamic = "force-dynamic";
export const metadata = { title: "Users & Roles · IOX Platform" };

export default async function UsersAdminPage() {
  const me = await requireSuperadmin();
  const users = await listAllUsers();

  const counts = {
    superadmin: users.filter((u) => u.role === "superadmin").length,
    director: users.filter((u) => u.role === "director").length,
    user: users.filter((u) => u.role === "user").length,
    testers: users.filter((u) => u.role !== "superadmin" && u.aiAssistantTester)
      .length,
  };

  return (
    <main className="min-h-screen bg-white px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-5">
          <h1 className="text-xl font-semibold text-zinc-900">Users &amp; Roles</h1>
          <p className="mt-1 text-[13px] text-zinc-500">
            Manage IOX-wide access. Super admins can use every module; the RatesX
            AI assistant is restricted to super admins and the testers you enable
            here.
          </p>
        </header>

        <div className="mb-5">
          <AddUserForm />
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["Super admins", counts.superadmin],
              ["Directors", counts.director],
              ["Users", counts.user],
              ["Assistant testers", counts.testers],
            ] as const
          ).map(([label, n]) => (
            <div
              key={label}
              className="rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2.5"
            >
              <div className="text-lg font-semibold tabular-nums text-zinc-900">
                {n}
              </div>
              <div className="text-[11px] text-zinc-500">{label}</div>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-200">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-zinc-50 text-[11px] uppercase tracking-wider text-zinc-500">
                <th className="py-2.5 px-3 font-medium">User</th>
                <th className="py-2.5 px-3 font-medium">Current role</th>
                <th className="py-2.5 px-3 font-medium">Change role</th>
                <th className="py-2.5 px-3 font-medium">RatesX AI assistant</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <UserRow
                  key={u.id}
                  isSelf={u.id === me.id}
                  user={{
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    role: u.role,
                    aiAssistantTester: u.aiAssistantTester,
                  }}
                />
              ))}
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-10 text-center text-sm text-zinc-400"
                  >
                    No users yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
