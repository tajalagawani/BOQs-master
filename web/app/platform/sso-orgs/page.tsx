import { requireSuperadmin } from "@/modules/core/authz";
import { listSsoOrgs } from "@/modules/identity/sso-org-queries";

import { AddOrgForm } from "./AddOrgForm";
import { OrgRow } from "./OrgRow";

export const dynamic = "force-dynamic";
export const metadata = { title: "SSO Orgs · IOX Platform" };

export default async function SsoOrgsPage() {
  await requireSuperadmin();
  const orgs = await listSsoOrgs();

  const enabled = orgs.filter((o) => o.enabled).length;

  return (
    <div className="p-4">
      <div className="mx-auto max-w-4xl">
        <header className="mb-5">
          <h1 className="text-xl font-semibold text-suite-ink">SSO Orgs</h1>
          <p className="mt-1 text-[13px] text-suite-ink-3">
            Microsoft Entra tenants allowed to sign in, and the IOX role their
            users get. The IOX tenant is the locked primary org (superadmin) and
            can&apos;t be removed. Add another organisation to let its people sign
            in via &ldquo;Continue with SSO&rdquo; as the role you choose.
          </p>
        </header>

        <div className="mb-5">
          <AddOrgForm />
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(
            [
              ["Orgs", orgs.length],
              ["Enabled", enabled],
              ["Disabled", orgs.length - enabled],
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
                <th className="py-2.5 px-3 font-medium">Org</th>
                <th className="py-2.5 px-3 font-medium">Tenant ID</th>
                <th className="py-2.5 px-3 font-medium">Email domains</th>
                <th className="py-2.5 px-3 font-medium">Default role</th>
                <th className="py-2.5 px-3 font-medium">Status</th>
                <th className="py-2.5 px-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <OrgRow
                  key={o.id}
                  org={{
                    id: o.id,
                    tenantId: o.tenantId,
                    name: o.name,
                    allowedEmailDomains: o.allowedEmailDomains,
                    defaultRole: o.defaultRole,
                    enabled: o.enabled,
                    isPrimary: o.isPrimary,
                  }}
                />
              ))}
              {orgs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-sm text-suite-ink-4"
                  >
                    No SSO orgs yet.
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
