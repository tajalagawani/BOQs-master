import Image from "next/image";
import { Header } from "@/components/Header";
import { ProjectPulse } from "@/components/ProjectPulse";
import { ModuleCard } from "@/components/ModuleCard";
import { Greeting } from "@/components/Greeting";
import {
  Box,
  Gavel,
  FileText,
  PieChart,
  ShieldCheck,
  ArrowLeftRight,
  BarChart3,
  FolderKanban,
  TrendingUp,
  Database,
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
    description:
      "Parametric masterplan cost modelling with building, parking, infrastructure and public-realm calculations.",
    href: "/costx",
    backgroundImage: "/card-cost-planning.png",
  },
  // ── Cross-module utilities ──
  {
    icon: <FolderKanban className="size-6" strokeWidth={1.25} />,
    title: "Projects",
    description: "Cross-module view of every masterplan and benchmark project.",
    href: "/projects",
    backgroundImage: "/card-cost-planning.png",
  },
  {
    icon: <TrendingUp className="size-6" strokeWidth={1.25} />,
    title: "Benchmarking",
    description: "Reference projects with NRM cost breakdowns to calibrate new estimates.",
    href: "/benchmarking",
    backgroundImage: "/card-reports.png",
  },
  {
    icon: <Database className="size-6" strokeWidth={1.25} />,
    title: "Rate Analysis",
    description: "Browse the full cost-model library — every NRM line, every asset typology.",
    href: "/cost-model-rate-analysis",
    backgroundImage: "/card-estimates.png",
  },
  // ── Non-X products ──
  {
    icon: <ShieldCheck className="size-6" strokeWidth={1.25} />,
    title: "Budget Control",
    description: "Track budgets vs actuals and stay ahead of variances.",
    href: undefined,
    backgroundImage: "/card-budget-control.png",
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
      {/* Fixed bg, full-bleed cover — slightly faded so it doesn't compete
          with the right panel or card chrome. */}
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 bg-no-repeat pointer-events-none"
        style={{
          backgroundImage: "url(/iox-bg.png)",
          backgroundSize: "cover",
          backgroundPosition: "center center",
        }}
      />

      <Header />

      {/*
        Strict no-scroll layout
        ─────────────────────────────────────────────────────────────
        body is `h-screen overflow-hidden flex-col` (see app/layout.tsx).
        Header is sticky. <main> takes the rest with min-h-0 + overflow-hidden
        so nothing inside can spill the viewport. Every nested flex/grid
        uses min-h-0 + flex-1 so children share the column height.
      */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {/* Explicit 2-column grid: left "1fr" absorbs space, right is a
            fixed 400px slot for Project Pulse. items-center on the left
            column truly centers its inner block. */}
        <div className="h-full w-full px-6 lg:px-8 py-3 lg:py-4 grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4 lg:gap-6">
          {/* Left grid track — hero + grid share one centered block so they
              read as a single rhythm. Hero is left-aligned with the grid's
              first column. Footer pinned to the bottom of the column. */}
          <div className="min-w-0 min-h-0 flex flex-col items-center">
            {/* Centered block that contains both hero and grid */}
            <div className="w-fit">
              <div className="mt-10 lg:mt-14">
                <Greeting name="Arjun" />
              </div>
              <div className="mt-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 grid-rows-2 auto-rows-[300px]">
                {modules.map((m) => (
                  <div key={m.title} className="w-55 h-75">
                    <ModuleCard
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
                  </div>
                ))}
              </div>
            </div>
            {/* Spacer pushes the footer to the bottom of the column. */}
            <div className="flex-1 min-h-0" />

            {/* Tiny footer — fixed height, full-width across the column. */}
            <div className="shrink-0 self-stretch flex items-center justify-between text-[10.5px] text-zinc-500 px-1">
              <div className="flex items-center gap-2.5">
                <Image
                  src="/iox-logo.svg"
                  alt="IOX"
                  width={1338}
                  height={461}
                  className="h-4 w-auto"
                />
                <span className="text-zinc-300">|</span>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3 text-zinc-500" strokeWidth={1.75} />
                  <span>Project data secured and synced in real time</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span>All systems normal</span>
              </div>
            </div>
          </div>

          {/* Right grid track — Project Pulse pinned in the 400px slot,
              capped at viewport height (scrolls internally if needed). */}
          <div className="hidden xl:flex min-h-0">
            <ProjectPulse />
          </div>
        </div>
      </main>
    </>
  );
}
