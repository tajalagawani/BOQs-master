import { Header } from "@/components/Header";
import { HomeWorkspace, type HomeModule } from "@/components/HomeWorkspace";
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

const modules: HomeModule[] = [
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

      <main className="flex-1 min-h-0 overflow-hidden">
        <HomeWorkspace name="Arjun" modules={modules} />
      </main>
    </>
  );
}
