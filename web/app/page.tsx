import { Header } from "@/components/Header";
import { ProjectPulse } from "@/components/ProjectPulse";
import { ModuleCard } from "@/components/ModuleCard";
import {
  Box,
  ClipboardList,
  Gavel,
  FileText,
  PieChart,
  Calculator,
  ShieldCheck,
  ShoppingCart,
  ArrowLeftRight,
  BarChart3,
} from "lucide-react";

const modules = [
  // ── X-suffix products first ──
  {
    icon: <Box className="size-6" strokeWidth={1.25} />,
    title: "PlanX",
    description: "Generate intelligent cost models using live rates and parameters.",
    href: undefined,
    backgroundImage: "/card-parametric.png",
  },
  {
    icon: <Gavel className="size-6" strokeWidth={1.25} />,
    title: "ProcureX",
    description: "Manage tender packages, submissions and bidder comparisons.",
    href: undefined,
    backgroundImage: "/card-tenders.png",
  },
  {
    icon: <FileText className="size-6" strokeWidth={1.25} />,
    title: "BOQsX",
    description: "Create, manage and version BOQs with ease and accuracy.",
    href: "/boqs",
    backgroundImage: "/card-boqs.png",
  },
  {
    icon: <PieChart className="size-6" strokeWidth={1.25} />,
    title: "CostX",
    description: "Parametric masterplan cost modelling with building, parking, infrastructure and public-realm calculations.",
    href: "/costx",
    backgroundImage: "/card-cost-planning.png",
  },
  // ── Non-X products ──
  {
    icon: <Calculator className="size-6" strokeWidth={1.25} />,
    title: "Estimates",
    description: "Build detailed estimates quickly with assemblies and rate libraries.",
    href: undefined,
    backgroundImage: "/card-estimates.png",
  },
  {
    icon: <ClipboardList className="size-6" strokeWidth={1.25} />,
    title: "Instructions",
    description: "Create, assign and track instructions with complete transparency.",
    href: undefined,
    backgroundImage: "/card-instructions.png",
  },
  {
    icon: <ShieldCheck className="size-6" strokeWidth={1.25} />,
    title: "Budget Control",
    description: "Track budgets vs actuals and stay ahead of variances.",
    href: undefined,
    backgroundImage: "/card-budget-control.png",
  },
  {
    icon: <ShoppingCart className="size-6" strokeWidth={1.25} />,
    title: "Procurement",
    description: "Raise PRs, manage POs and vendor performance in one place.",
    href: undefined,
    backgroundImage: "/card-procurement.png",
  },
  {
    icon: <ArrowLeftRight className="size-6" strokeWidth={1.25} />,
    title: "Change Orders",
    description: "Manage scope changes, approvals and cost impacts efficiently.",
    href: undefined,
    backgroundImage: "/card-change-orders.png",
  },
  {
    icon: <BarChart3 className="size-6" strokeWidth={1.25} />,
    title: "Reports & Analytics",
    description: "Get real-time insights with powerful reports and dashboards.",
    href: undefined,
    backgroundImage: "/card-reports.png",
  },
];

export default function Home() {
  return (
    <>
      {/* Background — full-bleed wireframe illustration sitting under the
          whole landing page. Uses CSS background to avoid affecting any
          flex layout above. */}
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 bg-no-repeat pointer-events-none"
        style={{
          backgroundImage: "url(/iox-bg.png)",
          backgroundSize: "contain",
          backgroundPosition: "right top",
        }}
      />
      <Header />
      <main className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full w-full px-8 py-5 flex gap-6">
          {/* Left column — hero + module grid + status bar */}
          <div className="flex-1 min-w-0 max-w-295 flex flex-col gap-4">
            {/* Hero — friendly greeting */}
            <div className="max-w-2xl">
              <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-500 font-medium mb-2">
                Tuesday, March 4
              </div>
              <h1 className="text-[clamp(36px,4vw,52px)] leading-[1.05] font-semibold tracking-tight text-zinc-900">
                Hello, <span className="text-zinc-900">Arjun</span>
                <span className="text-zinc-400">.</span>
              </h1>
              <p className="mt-3 text-sm text-zinc-500 leading-relaxed max-w-lg">
                Pick up where you left off — instructions, tenders, BOQs and budgets all in one workspace.
              </p>
            </div>

            {/* Module grid — pushed to the right edge of the column */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 auto-rows-[300px] my-auto ml-auto max-w-270 w-full">
              {modules.map((m) => (
                <ModuleCard
                  key={m.title}
                  icon={m.icon}
                  title={m.title}
                  description={m.description}
                  href={m.href}
                  backgroundImage={
                    "backgroundImage" in m
                      ? (m as { backgroundImage?: string }).backgroundImage
                      : undefined
                  }
                />
              ))}
            </div>

            {/* Tiny footer */}
            <div className="flex items-center justify-between text-[10.5px] text-zinc-500 px-1">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="size-3 text-zinc-500" strokeWidth={1.75} />
                <span>Project data secured and synced in real time</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span>All systems normal</span>
              </div>
            </div>
          </div>

          {/* Right column — Project Pulse pinned to the right edge */}
          <div className="hidden xl:block shrink-0 ml-auto">
            <ProjectPulse />
          </div>
        </div>
      </main>
    </>
  );
}
