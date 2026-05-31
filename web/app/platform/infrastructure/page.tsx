export const dynamic = "force-dynamic";
export const revalidate = 120;

import {
  Server,
  ExternalLink,
  MapPin,
  Cpu,
  Power,
  HardDrive,
  ShieldCheck,
  Globe2,
  Network,
  Calendar,
  MemoryStick,
  Disc3,
} from "lucide-react";
import { requirePlatformAccess } from "@/lib/platform/auth";
import { listResources, getVmDetail } from "@/lib/platform/infrastructure";
import { azureConfigured, platformEnvSync } from "@/lib/platform/platform-env";
import { ResourceTable } from "@/components/platform/ResourceTable";
import { CredentialsRequired } from "@/components/platform/CredentialsRequired";

export default async function InfrastructurePage() {
  await requirePlatformAccess();

  if (!(await azureConfigured())) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-6 space-y-5">
        <Hero />
        <CredentialsRequired
          title="Azure credentials required"
          description="Create a service principal with the Reader role on the iox-rg resource group, then set the four AZURE_* env vars below. The dashboard only ever reads — no write permissions are needed or used."
          vars={[
            { name: "AZURE_TENANT_ID" },
            { name: "AZURE_CLIENT_ID" },
            { name: "AZURE_CLIENT_SECRET" },
            { name: "AZURE_SUBSCRIPTION_ID" },
            { name: "AZURE_RESOURCE_GROUP", hint: 'default "iox-rg"' },
          ]}
          setupCommand={`SUB=$(az account show --query id -o tsv)
az ad sp create-for-rbac \\
  --name iox-platform-reader \\
  --role Reader \\
  --scopes /subscriptions/$SUB/resourceGroups/iox-rg`}
        />
      </div>
    );
  }

  const resources = await listResources();
  const firstVm = resources.find((r) => r.typeLabel === "Virtual machine");
  const vmDetail = firstVm ? await getVmDetail(firstVm.name) : null;

  const typeCounts = countByType(resources);

  return (
    <div className="mx-auto max-w-6xl px-6 py-6 space-y-5">
      <Hero
        portalHref={`https://portal.azure.com/#@${platformEnvSync.AZURE_TENANT_ID}/resource/subscriptions/${platformEnvSync.AZURE_SUBSCRIPTION_ID}/resourceGroups/${platformEnvSync.AZURE_RESOURCE_GROUP}/overview`}
      />

      {/* Topline stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat
          label="Resources"
          value={resources.length}
          icon={<Server className="size-3.5" strokeWidth={1.75} />}
          hint={`In ${platformEnvSync.AZURE_RESOURCE_GROUP}`}
        />
        <Stat
          label="Distinct types"
          value={typeCounts.length}
          icon={<HardDrive className="size-3.5" strokeWidth={1.75} />}
          hint={typeCounts
            .slice(0, 2)
            .map((t) => `${t.label} (${t.count})`)
            .join(" · ")}
        />
        <Stat
          label="Location"
          value={resources[0]?.location ?? "—"}
          icon={<MapPin className="size-3.5" strokeWidth={1.75} />}
          hint="Single region"
        />
        <Stat
          label="Tagged 'app=IOX-OS'"
          value={resources.filter((r) => r.tags.app === "IOX-OS").length}
          icon={<ShieldCheck className="size-3.5" strokeWidth={1.75} />}
          hint="Cost-attribution tag"
        />
      </div>

      {/* VM detail */}
      {firstVm && vmDetail && (
        <section className="bg-white border border-zinc-200 rounded-2xl p-5">
          <header className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10.5px] uppercase tracking-wide text-zinc-500 font-medium">
                Production VM
              </div>
              <h2 className="text-[15px] font-semibold text-zinc-900 inline-flex items-center gap-2">
                <span className="size-7 rounded-lg bg-zinc-900 text-white inline-flex items-center justify-center">
                  <Server className="size-3.5" strokeWidth={1.75} />
                </span>
                {vmDetail.name}
              </h2>
            </div>
            <a
              href={firstVm.portalUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[11.5px] font-medium text-zinc-700 hover:text-zinc-900 inline-flex items-center gap-1"
            >
              Open in portal <ExternalLink className="size-3" strokeWidth={1.75} />
            </a>
          </header>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2.5">
            <Field
              label="Size"
              icon={<Cpu className="size-3" strokeWidth={2} />}
              value={
                vmDetail.vcpu
                  ? `${vmDetail.vmSize} · ${vmDetail.vcpu} vCPU`
                  : vmDetail.vmSize
              }
            />
            <Field
              label="Memory"
              icon={<MemoryStick className="size-3" strokeWidth={2} />}
              value={vmDetail.memoryGiB ? `${vmDetail.memoryGiB} GiB` : "—"}
            />
            <Field
              label="Power"
              value={vmDetail.powerState ?? "—"}
              icon={<Power className="size-3" strokeWidth={2} />}
              tone={vmDetail.powerState?.toLowerCase().includes("running") ? "emerald" : "zinc"}
            />
            <Field
              label="Location"
              icon={<MapPin className="size-3" strokeWidth={2} />}
              value={vmDetail.location ?? "—"}
            />

            <Field
              label="Public IP"
              icon={<Globe2 className="size-3" strokeWidth={2} />}
              value={vmDetail.publicIps[0] ?? "—"}
              mono
            />
            <Field
              label="Private IP"
              icon={<Network className="size-3" strokeWidth={2} />}
              value={vmDetail.privateIps[0] ?? "—"}
              mono
            />
            <Field
              label="OS disk"
              icon={<HardDrive className="size-3" strokeWidth={2} />}
              value={
                vmDetail.osDiskSizeGB
                  ? `${vmDetail.osDiskSizeGB} GiB${vmDetail.osDiskType ? ` · ${formatDiskType(vmDetail.osDiskType)}` : ""}`
                  : "—"
              }
            />
            <Field
              label="Data disks"
              icon={<Disc3 className="size-3" strokeWidth={2} />}
              value={String(vmDetail.dataDiskCount)}
            />

            <Field
              label="OS"
              value={
                [vmDetail.osType, vmDetail.imageOffer, vmDetail.imageSku]
                  .filter(Boolean)
                  .join(" · ") || "—"
              }
            />
            <Field label="Computer name" value={vmDetail.computerName ?? "—"} mono />
            <Field label="Admin user" value={vmDetail.adminUsername ?? "—"} mono />
            <Field
              label="Created"
              icon={<Calendar className="size-3" strokeWidth={2} />}
              value={
                vmDetail.timeCreated
                  ? new Date(vmDetail.timeCreated).toLocaleDateString()
                  : "—"
              }
            />
          </dl>
        </section>
      )}

      <section>
        <header className="flex items-baseline justify-between mb-2.5 px-1">
          <div>
            <h2 className="text-[12.5px] font-semibold text-zinc-900">All resources</h2>
            <p className="text-[11px] text-zinc-500">
              Live from Azure Resource Manager API. Read-only.
            </p>
          </div>
        </header>
        <ResourceTable resources={resources} />
      </section>
    </div>
  );
}

function Hero({ portalHref }: { portalHref?: string }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-500 font-medium inline-flex items-center gap-1.5">
          <Server className="size-3" strokeWidth={2} /> Operations
        </div>
        <h1 className="mt-1 text-[clamp(22px,2.2vw,28px)] leading-tight font-semibold tracking-tight text-zinc-900">
          Infrastructure <span style={{ color: "#60B78C" }}>.</span>
        </h1>
        <p className="mt-1 text-[12.5px] text-zinc-500 max-w-2xl">
          Every Azure resource backing IOX. Resource group{" "}
          <code className="text-[11px] bg-zinc-100 px-1 py-0.5 rounded">
            {platformEnvSync.AZURE_RESOURCE_GROUP}
          </code>{" "}
          in UAE North.
        </p>
      </div>
      {portalHref && (
        <a
          href={portalHref}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-zinc-200 bg-white text-[12.5px] text-zinc-700 hover:border-zinc-300 hover:text-zinc-900"
        >
          Open in Azure portal <ExternalLink className="size-3" strokeWidth={1.75} />
        </a>
      )}
    </header>
  );
}

function Stat({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-4">
      <div className="size-8 rounded-lg inline-flex items-center justify-center ring-1 bg-zinc-900 text-white ring-zinc-200">
        {icon}
      </div>
      <div className="mt-3 text-[10.5px] uppercase tracking-wide text-zinc-500 font-medium">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 truncate">
        {value}
      </div>
      {hint && <div className="text-[11px] text-zinc-500 mt-1 truncate">{hint}</div>}
    </div>
  );
}

function Field({
  label,
  value,
  icon,
  tone,
  mono,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: "emerald" | "zinc";
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10.5px] uppercase tracking-wide text-zinc-500 font-medium">{label}</dt>
      <dd
        className={`mt-0.5 text-[12.5px] font-medium inline-flex items-center gap-1 ${
          tone === "emerald" ? "text-emerald-700" : "text-zinc-900"
        } ${mono ? "font-mono text-[11.5px]" : ""}`}
      >
        {icon}
        {value}
      </dd>
    </div>
  );
}

function formatDiskType(s: string): string {
  return s
    .replace("Standard_LRS", "Standard HDD")
    .replace("StandardSSD_LRS", "Standard SSD")
    .replace("Premium_LRS", "Premium SSD")
    .replace("Premium_ZRS", "Premium SSD (ZRS)")
    .replace("UltraSSD_LRS", "Ultra SSD");
}

function countByType(resources: { typeLabel: string }[]) {
  const m = new Map<string, number>();
  for (const r of resources) m.set(r.typeLabel, (m.get(r.typeLabel) ?? 0) + 1);
  return [...m.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}
