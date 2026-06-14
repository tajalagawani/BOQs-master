import { SuiteHome } from "@/components/suite";
import type { SuiteApp, SuiteStat, SuiteTabItem } from "@/components/suite";
import { getSession } from "@/lib/session";
import { getHomePulse } from "@/lib/pulse/home";
import type { PulseMetric } from "@/lib/pulse/types";

// Renders per-request: the home page reads the session (prisma.user) + home
// pulse from the DB, which isn't reachable during `next build` (CI uses a
// placeholder DATABASE_URL and never connects). Without this, Next tries to
// statically prerender "/" at build time and fails with ECONNREFUSED.
export const dynamic = "force-dynamic";

/** Product Suite category lens — decorative highlight on the launcher hero. */
const SUITE_TABS: SuiteTabItem[] = [
  { key: "capex", label: "CapEx Intelligence", dot: "blue" },
  { key: "opex", label: "OpEx Intelligence", dot: "amber" },
  { key: "totex", label: "TotEx Financial Intelligence", dot: "olive" },
  { key: "esg", label: "ESG & Carbon Intelligence", dot: "green" },
  { key: "variation", label: "Variation & Foresight Layer", dot: "red" },
];

/** Split a pulse metric sub-line like "5 active" into a stat. Non-numeric
 *  sub-lines ("templates", "cost plans") return null and are skipped. */
function statFromSub(sub?: string): SuiteStat | null {
  if (!sub) return null;
  const m = sub.match(/^(\d[\d.,]*)\s+(.*)$/);
  return m ? { value: m[1], label: m[2] } : null;
}

export default async function Home() {
  const { user } = await getSession();
  const pulse = await getHomePulse(user.id);

  const byLabel = Object.fromEntries(
    pulse.metrics.map((m) => [m.label, m]),
  ) as Record<string, PulseMetric | undefined>;
  const tenders = byLabel["Tenders"];
  const masterplans = byLabel["Masterplans"];
  const boqs = byLabel["BOQs"];
  const planValue = byLabel["Plan Value"];

  const apps: SuiteApp[] = [
    {
      key: "procurex",
      title: "ProcureX",
      tag: "Tender analysis, accelerated",
      href: "/procurex",
      accent: "blue",
      preview: "tenders",
      stats: [
        { value: tenders?.value ?? "00", label: "tenders" },
        statFromSub(tenders?.sub),
        { value: boqs?.value ?? "00", label: "priced BOQs" },
      ].filter((s): s is SuiteStat => !!s),
      previewData: {
        title: pulse.hero.title,
        primary: tenders?.value ?? "—",
        primaryLabel: "Tenders",
        secondary: statFromSub(tenders?.sub)?.value ?? "0",
        secondaryLabel: "Pending",
      },
    },
    {
      key: "boqsx",
      title: "BOQsX",
      tag: "Create, code and version BOQs",
      href: "/boqs",
      accent: "olive",
      preview: "boqs",
      stats: [{ value: boqs?.value ?? "00", label: "BOQ templates" }],
      features: ["AI extraction & NRM coding", "Version history & audit trail"],
    },
    {
      key: "costx",
      title: "CostX",
      tag: "Parametric masterplan cost modelling",
      href: "/costx",
      accent: "amber",
      preview: "cost",
      stats: [
        { value: masterplans?.value ?? "00", label: "masterplans" },
        statFromSub(masterplans?.sub),
        { value: planValue?.value ?? "—", label: "plan value" },
      ].filter((s): s is SuiteStat => !!s),
      previewData: { cost: planValue?.value ?? "AED —" },
    },
    {
      key: "ratesx",
      title: "RatesX",
      tag: "Construction rates intelligence",
      href: "/rates",
      accent: "green",
      preview: "rates",
      features: [
        "Benchmark analytics",
        "Cost rate identification",
        "Key material tracking",
      ],
    },
    {
      key: "projects",
      title: "Projects",
      tag: "Every masterplan and benchmark, connected",
      href: "/projects",
      accent: "blue",
      preview: "projects",
      stats: [
        { value: masterplans?.value ?? "00", label: "masterplans" },
        { value: tenders?.value ?? "00", label: "tenders" },
      ],
      previewData: {
        location: pulse.hero.title,
        meta: pulse.hero.subtitle ?? "Portfolio",
      },
    },
    // ── Coming soon ──
    {
      key: "planx",
      title: "PlanX",
      tag: "Intelligent cost models from live rates",
      accent: "blue",
      preview: "soon",
      features: ["Live-rate cost models", "Scenario parameters"],
    },
    {
      key: "benchmarking",
      title: "Benchmarking",
      tag: "Reference projects with NRM breakdowns",
      accent: "green",
      preview: "soon",
      features: ["Calibrate new estimates", "NRM cost breakdowns"],
    },
    {
      key: "rate-analysis",
      title: "Rate Analysis",
      tag: "The full cost-model library",
      accent: "olive",
      preview: "soon",
      features: ["Every NRM line", "Every asset typology"],
    },
    {
      key: "change-orders",
      title: "Change Orders",
      tag: "Scope changes, approvals and impacts",
      accent: "amber",
      preview: "soon",
      features: ["Approval workflow", "Cost-impact tracking"],
    },
    {
      key: "reports",
      title: "Reports & Analytics",
      tag: "Real-time insights and dashboards",
      accent: "red",
      preview: "soon",
      features: ["Programme-wide reporting", "Live dashboards"],
    },
  ];

  return (
    <main className="flex-1 min-h-0 overflow-y-auto">
      <SuiteHome name={user.name} apps={apps} tabs={SUITE_TABS} />
    </main>
  );
}
