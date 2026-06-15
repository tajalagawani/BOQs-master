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
    <div className="p-4">
      <div className="mx-auto max-w-4xl">
        <header className="mb-5">
          <h1 className="text-xl font-semibold text-suite-ink">Users &amp; Roles</h1>
          <p className="mt-1 text-[13px] text-suite-ink-3">
            Manage IOX-wide access. Super admins can use every module; the ioInsight
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
              className="rounded-lg border border-suite-line bg-suite-card-soft px-3 py-2.5"
            >
              <div className="text-lg font-semibold suite-num text-suite-ink">
                {n}
              </div>
              <div className="text-[11px] text-suite-ink-3">{label}</div>
            </div>
          ))}
        </div>

        <div className="suite-tbl">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="py-2.5 px-3 font-medium">User</th>
                <th className="py-2.5 px-3 font-medium">Current role</th>
                <th className="py-2.5 px-3 font-medium">Change role</th>
                <th className="py-2.5 px-3 font-medium">ioInsight AI assistant</th>
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
                    className="py-10 text-center text-sm text-suite-ink-4"
                  >
                    No users yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
