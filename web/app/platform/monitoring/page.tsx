export const dynamic = "force-dynamic";
export const revalidate = 120;

import { Activity, Cpu, MemoryStick, AlertOctagon, ExternalLink } from "lucide-react";
import { requirePlatformAccess } from "@/lib/platform/auth";
import {
  getCpuSeries,
  getMemorySeries,
  getSyslogErrorCountSeries,
  getRecentSyslogErrors,
  type MonitoringWindow,
} from "@/lib/platform/log-analytics";
import {
  logAnalyticsConfigured,
  azureConfigured,
  platformEnvSync,
} from "@/lib/platform/platform-env";
import { MetricChart } from "@/components/platform/MetricChart";
import { SyslogList } from "@/components/platform/SyslogList";
import { CredentialsRequired } from "@/components/platform/CredentialsRequired";

interface PageProps {
  searchParams: Promise<{ w?: string }>;
}

const WINDOWS: { value: MonitoringWindow; label: string }[] = [
  { value: "1h", label: "1 h" },
  { value: "24h", label: "24 h" },
  { value: "7d", label: "7 d" },
];

export default async function MonitoringPage({ searchParams }: PageProps) {
  await requirePlatformAccess();

  if (!(await logAnalyticsConfigured())) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-6 space-y-5">
        <Hero />
        <CredentialsRequired
          title={
            !(await azureConfigured())
              ? "Azure credentials required"
              : "Log Analytics workspace ID required"
          }
          description={
            !(await azureConfigured())
              ? "Create a service principal with the Reader role on the iox-rg resource group, then set the four AZURE_* env vars below."
              : "Provide the workspace GUID (not the full resource ID) so Kusto queries against InsightsMetrics + Syslog can be issued."
          }
          vars={[
            { name: "AZURE_TENANT_ID" },
            { name: "AZURE_CLIENT_ID" },
            { name: "AZURE_CLIENT_SECRET" },
            { name: "AZURE_SUBSCRIPTION_ID" },
            { name: "AZURE_RESOURCE_GROUP", hint: 'default "iox-rg"' },
            {
              name: "AZURE_LOG_ANALYTICS_WORKSPACE_ID",
              hint: "guid, not full /subscriptions/… path",
            },
          ]}
          setupCommand={`az ad sp create-for-rbac \\
  --name iox-platform-reader \\
  --role Reader \\
  --scopes /subscriptions/$(az account show --query id -o tsv)/resourceGroups/iox-rg

az monitor log-analytics workspace show \\
  --resource-group iox-rg --workspace-name iox-law \\
  --query customerId -o tsv`}
        />
      </div>
    );
  }

  const { w } = await searchParams;
  const window: MonitoringWindow =
    w === "1h" || w === "7d" ? (w as MonitoringWindow) : "24h";

  const [cpu, mem, errs, recent] = await Promise.all([
    getCpuSeries(window),
    getMemorySeries(window),
    getSyslogErrorCountSeries(window),
    getRecentSyslogErrors(15),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-6 space-y-5">
      <Hero />

      <WindowSwitcher current={window} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ChartCard
          icon={<Cpu className="size-3.5" strokeWidth={1.75} />}
          label="CPU utilization"
          subtitle="avg, % over interval"
          color="#10b981"
        >
          <MetricChart data={cpu} unit="%" yMax={100} color="#10b981" />
        </ChartCard>
        <ChartCard
          icon={<MemoryStick className="size-3.5" strokeWidth={1.75} />}
          label="Memory utilization"
          subtitle="avg, % of 8 GiB"
          color="#6366f1"
        >
          <MetricChart data={mem} unit="%" yMax={100} color="#6366f1" />
        </ChartCard>
        <ChartCard
          icon={<AlertOctagon className="size-3.5" strokeWidth={1.75} />}
          label="Syslog error count"
          subtitle="err + crit + alert + emerg, per bucket"
          color="#f43f5e"
          fullSpan
        >
          <MetricChart data={errs} unit="" color="#f43f5e" precision={0} />
        </ChartCard>
      </div>

      <section className="bg-white border border-suite-line rounded-2xl p-5">
        <header className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-[13px] font-semibold text-suite-ink">Recent error logs</h2>
            <p className="text-[11px] text-suite-ink-3">
              Last 15 entries from <code className="text-[10.5px] bg-suite-card-soft px-1 py-0.5 rounded suite-num">Syslog</code> with severity err+.
            </p>
          </div>
          <span className="text-[11px] text-suite-ink-3 suite-num">{recent.length} entries</span>
        </header>
        <SyslogList entries={recent} />
      </section>

      <p className="text-[11px] text-suite-ink-4 px-1">
        Workspace ID:{" "}
        <code className="bg-suite-card-soft px-1 py-0.5 rounded text-[10.5px] suite-num">
          {platformEnvSync.AZURE_LOG_ANALYTICS_WORKSPACE_ID.slice(0, 8)}…
        </code>{" "}
        · Resource group:{" "}
        <code className="bg-suite-card-soft px-1 py-0.5 rounded text-[10.5px] suite-num">
          {platformEnvSync.AZURE_RESOURCE_GROUP}
        </code>
      </p>
    </div>
  );
}

function Hero() {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="text-[11px] uppercase tracking-[0.12em] text-suite-ink-3 font-medium inline-flex items-center gap-1.5">
          <Activity className="size-3" strokeWidth={2} /> Operations
        </div>
        <h1 className="mt-1 text-[clamp(22px,2.2vw,28px)] leading-tight font-semibold tracking-tight text-suite-ink">
          Monitoring <span style={{ color: "#60B78C" }}>.</span>
        </h1>
        <p className="mt-1 text-[12.5px] text-suite-ink-3 max-w-2xl">
          Live CPU, memory, and syslog metrics for{" "}
          <code className="text-[11px] bg-suite-card-soft px-1 py-0.5 rounded suite-num">iox-vm-01</code> via Azure
          Monitor + Log Analytics workspace{" "}
          <code className="text-[11px] bg-suite-card-soft px-1 py-0.5 rounded suite-num">iox-law</code>.
        </p>
      </div>
      <a
        href={`https://portal.azure.com/#@${platformEnvSync.AZURE_TENANT_ID}/blade/Microsoft_OperationsManagementSuite_Workspace/AnalyticsBlade`}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-suite-line bg-white text-[12.5px] text-suite-ink-2 hover:border-suite-line-2 hover:text-suite-ink"
      >
        Open in Azure portal <ExternalLink className="size-3" strokeWidth={1.75} />
      </a>
    </header>
  );
}

function WindowSwitcher({ current }: { current: MonitoringWindow }) {
  return (
    <div className="inline-flex items-center gap-0.5 bg-suite-card-soft rounded-md p-0.5">
      {WINDOWS.map((w) => {
        const active = current === w.value;
        return (
          <a
            key={w.value}
            href={`/platform/monitoring?w=${w.value}`}
            className={`h-7 px-3 text-[11.5px] font-medium rounded transition-colors ${
              active
                ? "bg-white text-suite-ink shadow-sm"
                : "text-suite-ink-2 hover:text-suite-ink"
            }`}
          >
            {w.label}
          </a>
        );
      })}
    </div>
  );
}

function ChartCard({
  icon,
  label,
  subtitle,
  color,
  children,
  fullSpan,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  color: string;
  children: React.ReactNode;
  fullSpan?: boolean;
}) {
  return (
    <div
      className={`bg-white border border-suite-line rounded-2xl p-4 ${
        fullSpan ? "md:col-span-2" : ""
      }`}
    >
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="size-7 rounded-lg inline-flex items-center justify-center ring-1"
            style={{
              backgroundColor: `${color}15`,
              color,
              boxShadow: `inset 0 0 0 1px ${color}25`,
            }}
          >
            {icon}
          </span>
          <div>
            <div className="text-[12.5px] font-semibold text-suite-ink leading-tight">
              {label}
            </div>
            <div className="text-[10.5px] text-suite-ink-3">{subtitle}</div>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
