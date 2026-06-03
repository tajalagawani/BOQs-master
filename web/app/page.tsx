import { Header } from "@/components/Header";
import { HomeWorkspace, type HomeModule } from "@/components/HomeWorkspace";
import { getSession } from "@/lib/session";
import { getHomePulse } from "@/lib/pulse/home";
import {
  Box,
  Gavel,
  FileText,
  PieChart,
  ArrowLeftRight,
  BarChart3,
  FolderKanban,
  TrendingUp,
  Database,
} from "lucide-react";

const modules: HomeModule[] = [
  // ── Active modules first ──
  {
    icon: <Gavel className="size-6" strokeWidth={1.25} />,
    title: "ProcureX",
    description: "Manage tender packages, submissions and bidder comparisons.",
    href: "/procurex",
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
  {
    icon: <Database className="size-6" strokeWidth={1.25} />,
    title: "RatesX",
    description:
      "Construction rates intelligence — projects, benchmarks, materials and commodities across every sector.",
    href: "/rates",
    backgroundImage: "/card-budget-control.png",
  },
  {
    icon: <FolderKanban className="size-6" strokeWidth={1.25} />,
    title: "Projects",
    description: "Cross-module view of every masterplan and benchmark project.",
    href: "/projects",
    backgroundImage: "/card-cost-planning.png",
  },
  // ── Coming soon ──
  {
    icon: <Box className="size-6" strokeWidth={1.25} />,
    title: "PlanX",
    description: "Generate intelligent cost models using live rates and parameters.",
    href: undefined,
    backgroundImage: "/card-parametric.png",
  },
  {
    icon: <TrendingUp className="size-6" strokeWidth={1.25} />,
    title: "Benchmarking",
    description: "Reference projects with NRM cost breakdowns to calibrate new estimates.",
    href: undefined,
    backgroundImage: "/card-reports.png",
  },
  {
    icon: <Database className="size-6" strokeWidth={1.25} />,
    title: "Rate Analysis",
    description: "Browse the full cost-model library — every NRM line, every asset typology.",
    href: undefined,
    backgroundImage: "/card-estimates.png",
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

export default async function Home() {
  const { user } = await getSession();
  const pulse = await getHomePulse(user.id);

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

      <main className="flex-1 min-h-0 overflow-hidden">
        <HomeWorkspace name={user.name} modules={modules} pulse={pulse} />
      </main>
    </>
  );
}
