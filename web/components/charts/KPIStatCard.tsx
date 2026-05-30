"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent } from "@/components/ui/Card";

export type TrendType = "up" | "neutral" | "down";
export type ChangeType = "positive" | "neutral" | "negative";
export type ColorTheme = "white" | "teal" | "blue" | "green" | "amber" | "red" | "purple" | "gray";

export interface KPIStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  changeType?: ChangeType;
  trendType?: TrendType;
  trendPosition?: "top" | "bottom";
  className?: string;
  icon?: React.ReactNode;
  tooltip?: string;
  description?: string;
  sparklineData?: number[];
  colorTheme?: ColorTheme;
}

const formatValue = (value: string | number | undefined | null): string => {
  if (value === undefined || value === null) return "0";
  if (typeof value === "string") return value;
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

const TrendIcon = ({ type, className = "" }: { type: TrendType; className?: string }) => {
  if (type === "up") {
    return (
      <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 17L17 7M17 7H7M17 7V17" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "down") {
    return (
      <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 7L17 17M17 17H7M17 17V7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12H19M19 12L13 6M19 12L13 18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const themeStyles: Record<ColorTheme, {
  bg: string;
  text: string;
  subtext: string;
  border: string;
  sparkline: string;
  sparklineFill: string;
  chip: string;
  chipText: string;
}> = {
  white: {
    bg: "bg-white",
    text: "text-gray-900",
    subtext: "text-gray-500",
    border: "border-gray-200",
    sparkline: "#18181B",
    sparklineFill: `${"#18181B"}1A`,
    chip: "bg-gray-100",
    chipText: "text-gray-600",
  },
  teal: {
    bg: "bg-zinc-900",
    text: "text-white",
    subtext: "text-zinc-300",
    border: "border-transparent",
    sparkline: "#10B981",
    sparklineFill: "rgba(16, 185, 129, 0.3)",
    chip: "bg-white/15",
    chipText: "text-white",
  },
  blue: {
    bg: "bg-blue-600",
    text: "text-white",
    subtext: "text-white/70",
    border: "border-transparent",
    sparkline: "#93C5FD",
    sparklineFill: "rgba(147, 197, 253, 0.3)",
    chip: "bg-white/20",
    chipText: "text-white",
  },
  green: {
    bg: "bg-green-600",
    text: "text-white",
    subtext: "text-white/70",
    border: "border-transparent",
    sparkline: "#86EFAC",
    sparklineFill: "rgba(134, 239, 172, 0.3)",
    chip: "bg-white/20",
    chipText: "text-white",
  },
  amber: {
    bg: "bg-amber-500",
    text: "text-white",
    subtext: "text-white/70",
    border: "border-transparent",
    sparkline: "#FDE047",
    sparklineFill: "rgba(253, 224, 71, 0.3)",
    chip: "bg-white/20",
    chipText: "text-white",
  },
  red: {
    bg: "bg-red-500",
    text: "text-white",
    subtext: "text-white/70",
    border: "border-transparent",
    sparkline: "#FCA5A5",
    sparklineFill: "rgba(252, 165, 165, 0.3)",
    chip: "bg-white/20",
    chipText: "text-white",
  },
  purple: {
    bg: "bg-purple-600",
    text: "text-white",
    subtext: "text-white/70",
    border: "border-transparent",
    sparkline: "#D8B4FE",
    sparklineFill: "rgba(216, 180, 254, 0.3)",
    chip: "bg-white/20",
    chipText: "text-white",
  },
  gray: {
    bg: "bg-gray-700",
    text: "text-white",
    subtext: "text-white/70",
    border: "border-transparent",
    sparkline: "#D1D5DB",
    sparklineFill: "rgba(209, 213, 219, 0.3)",
    chip: "bg-white/20",
    chipText: "text-white",
  },
};

export function KPIStatCard({
  title,
  value,
  subtitle,
  change,
  changeType = "neutral",
  trendType = "neutral",
  trendPosition = "top",
  className = "",
  icon,
  tooltip,
  description,
  sparklineData,
  colorTheme = "white",
}: KPIStatCardProps) {
  const styles = themeStyles[colorTheme];
  const chartData = sparklineData?.map((v, i) => ({ value: v, index: i })) || [];

  // Use description if provided, otherwise fall back to tooltip for inline display
  const inlineText = description || tooltip;

  const changeColors = {
    positive: colorTheme === "white" ? "text-green-600" : "text-green-300",
    negative: colorTheme === "white" ? "text-red-600" : "text-red-300",
    neutral: colorTheme === "white" ? "text-amber-600" : "text-amber-300",
  };

  return (
    <Card className={`${styles.bg} ${styles.border} border relative overflow-hidden ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {icon && <span className={styles.subtext}>{icon}</span>}
              <dt className={`text-xs font-medium ${styles.subtext}`}>{title}</dt>
            </div>
            <dd className={`text-2xl font-bold ${styles.text}`}>
              {formatValue(value)}
            </dd>
            {(subtitle || change) && (
              <div className="flex items-center gap-2 mt-1">
                {change && (
                  <span className={`flex items-center gap-0.5 text-xs font-medium ${changeColors[changeType]}`}>
                    <TrendIcon type={trendType} />
                    {change}
                  </span>
                )}
                {subtitle && (
                  <span className={`text-xs ${styles.subtext}`}>{subtitle}</span>
                )}
              </div>
            )}
            {/* Inline description text */}
            {inlineText && (
              <p className={`text-[10px] leading-tight mt-2 ${styles.subtext} line-clamp-2`}>
                {inlineText}
              </p>
            )}
          </div>

          {/* Sparkline Chart */}
          {sparklineData && sparklineData.length > 0 && (
            <div className="w-20 h-12 ml-2 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id={`gradient-${colorTheme}-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={styles.sparkline} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={styles.sparkline} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={styles.sparkline}
                    strokeWidth={2}
                    fill={`url(#gradient-${colorTheme}-${title.replace(/\s/g, '')})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Grid component for displaying multiple KPI cards
export interface KPIStatGridProps {
  stats: KPIStatCardProps[];
  columns?: 2 | 3 | 4 | 5 | 6;
  compact?: boolean;
}

export function KPIStatGrid({ stats, columns = 4, compact = false }: KPIStatGridProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
    6: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
  };

  if (compact) {
    return (
      <dl className={`grid ${gridCols[columns]} gap-3`}>
        {stats.map((stat, index) => (
          <KPIStatCardCompact key={index} {...stat} />
        ))}
      </dl>
    );
  }

  return (
    <dl className={`grid ${gridCols[columns]} gap-3`}>
      {stats.map((stat, index) => (
        <KPIStatCard key={index} {...stat} />
      ))}
    </dl>
  );
}

// Compact version for dense layouts
export function KPIStatCardCompact({
  title,
  value,
  change,
  changeType = "neutral",
  trendType = "neutral",
  className = "",
  tooltip,
  description,
}: Omit<KPIStatCardProps, "trendPosition" | "subtitle" | "icon" | "sparklineData" | "colorTheme">) {
  const inlineText = description || tooltip;

  const chipColors = {
    positive: "text-green-600",
    neutral: "text-amber-600",
    negative: "text-red-600",
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">{title}</span>
        {change && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${chipColors[changeType]}`}>
            <TrendIcon type={trendType} />
            {change}
          </span>
        )}
      </div>
      <div className="text-lg font-semibold text-gray-900 mt-1">
        {formatValue(value)}
      </div>
      {inlineText && (
        <p className="text-[10px] leading-tight mt-1 text-gray-400 line-clamp-2">
          {inlineText}
        </p>
      )}
    </div>
  );
}

export default KPIStatCard;
