/**
 * SummaryCards — top-of-editor metrics strip.
 * Ported from roshn/src/components/SummaryCards.tsx with brand
 * palette swapped for IOX zinc + emerald tones.
 */
"use client";

import { Card, CardContent } from "@/components/ui/Card";
import { formatNumber } from "@/utils/formatters";
import { cn } from "@/lib/cn";

interface Props {
  initialBudget: number;
  constructionCost: number;
  totalCost: number;
  grossLandArea: number;
  calculatedPlotArea: number;
  targetFAR: number;
  calculatedFAR: number;
  balanceExternalArea: number;
  softCosts: number;
  authorityFees: number;
  contingency: number;
}

function formatValue(value: number | string | undefined | null): string {
  if (value === undefined || value === null) return "0";
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

type Variant = "white" | "dark" | "tinted";

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  variant?: Variant;
}

function MetricCard({
  title,
  value,
  description,
  variant = "white",
}: MetricCardProps) {
  const styles: Record<Variant, { bg: string; text: string; sub: string; border: string }> = {
    white: {
      bg: "bg-white",
      text: "text-zinc-900",
      sub: "text-zinc-500",
      border: "border-zinc-200",
    },
    dark: {
      bg: "bg-zinc-900",
      text: "text-white",
      sub: "text-white/70",
      border: "border-transparent",
    },
    tinted: {
      bg: "bg-emerald-50",
      text: "text-emerald-900",
      sub: "text-emerald-900/70",
      border: "border-emerald-100",
    },
  };
  const s = styles[variant];

  return (
    <Card className={cn(s.bg, s.border, "border relative overflow-hidden py-0")}>
      <CardContent className="p-3 h-full flex flex-col justify-between">
        <div>
          <dt className={cn("text-[10.5px] font-medium uppercase tracking-wide", s.sub)}>
            {title}
          </dt>
          <dd className={cn("text-xl font-bold mt-1", s.text)}>
            {typeof value === "string" &&
            (value.includes("sqm") || value.includes("%"))
              ? value
              : formatValue(value)}
          </dd>
        </div>
        {description && (
          <p className={cn("text-[10px] leading-tight mt-2", s.sub)}>
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function SummaryCards({
  initialBudget,
  constructionCost,
  totalCost,
  grossLandArea,
  calculatedPlotArea,
  targetFAR,
  calculatedFAR,
  balanceExternalArea,
  softCosts,
  authorityFees,
  contingency,
}: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
      <MetricCard
        title="Initial Budget"
        value={initialBudget}
        description="Total approved budget for the project"
        variant="dark"
      />
      <MetricCard
        title="Total Cost"
        value={totalCost}
        description="All-in project cost including soft costs"
        variant="dark"
      />
      <MetricCard
        title="Construction Cost"
        value={constructionCost}
        description="Hard cost for construction works"
      />
      <MetricCard
        title="Soft Costs"
        value={softCosts}
        description="Professional fees and consultancy costs"
      />
      <MetricCard
        title="Authority Fees"
        value={authorityFees}
        description="Government and regulatory fees"
        variant="tinted"
      />
      <MetricCard
        title="Contingency"
        value={contingency}
        description="Risk allowance for unforeseen costs"
        variant="tinted"
      />

      <MetricCard
        title="Target FAR"
        value={targetFAR.toFixed(2)}
        description="Target Floor Area Ratio for optimal density"
        variant="dark"
      />
      <MetricCard
        title="Calculated FAR"
        value={calculatedFAR.toFixed(2)}
        description="Current Floor Area Ratio based on design"
        variant="dark"
      />
      <MetricCard
        title="Gross Land Area"
        value={`${formatNumber(grossLandArea)} sqm`}
        description="Total land area allocated for development"
      />
      <MetricCard
        title="Plot Area"
        value={`${formatNumber(calculatedPlotArea)} sqm`}
        description="Total calculated plot area for buildings"
      />
      <MetricCard
        title="External Area"
        value={`${formatNumber(balanceExternalArea)} sqm`}
        description="Balance external area remaining"
        variant="tinted"
      />
      <MetricCard
        title="Variance"
        value={initialBudget - totalCost}
        description="Difference between budget and total cost"
        variant="tinted"
      />
    </div>
  );
}
