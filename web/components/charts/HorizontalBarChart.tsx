"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
  LabelList,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatAbbreviated } from "@/lib/chartColors";

interface Props {
  data: Array<Record<string, string | number>>;
  dataKeys: string[];
  colors: Record<string, string>;
  height?: number;
  onBarClick?: (dataKey: string) => void;
  stacked?: boolean;
  showSumLabels?: boolean;
  singleBarColor?: string;
  categoryKey?: string;
}

// Custom label component for sum display
const SumLabel = (props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
}) => {
  const { x = 0, y = 0, width = 0, height = 0, value } = props;

  if (value === undefined || value === 0) return null;

  return (
    <text
      x={x + width + 5}
      y={y + height / 2}
      fill="#6B7280"
      fontSize={10}
      dominantBaseline="middle"
    >
      Sum: {formatAbbreviated(value)}
    </text>
  );
};

export default function HorizontalBarChart({
  data,
  dataKeys,
  colors,
  height = 500,
  onBarClick,
  stacked = true,
  showSumLabels = false,
  singleBarColor,
  categoryKey = "category",
}: Props) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center bg-gray-50 rounded">
        <p className="text-gray-500 text-sm">No data available</p>
      </div>
    );
  }

  // Sanitize keys for CSS variable names (remove spaces and special chars)
  const sanitizeKey = (key: string) => key.replace(/[^a-zA-Z0-9]/g, '-');

  // Create chart config from dataKeys and colors
  const chartConfig: ChartConfig = dataKeys.reduce((acc, key) => {
    const sanitized = sanitizeKey(key);
    acc[sanitized] = {
      label: key,
      color: colors[key] || "#999",
    };
    return acc;
  }, {} as ChartConfig);

  // Create a mapping of original key to sanitized key
  const keyMapping = dataKeys.reduce((acc, key) => {
    acc[key] = sanitizeKey(key);
    return acc;
  }, {} as Record<string, string>);

  // Calculate row totals for sum labels if stacked
  const dataWithTotals = showSumLabels && stacked
    ? data.map((row) => {
        const total = dataKeys.reduce((sum, key) => {
          const val = row[key];
          return sum + (typeof val === "number" ? val : 0);
        }, 0);
        return { ...row, _total: total };
      })
    : data;

  // For single bar mode (one data key), add sum label
  const isSingleBar = dataKeys.length === 1;
  const singleDataKey = isSingleBar ? dataKeys[0] : null;

  // Calculate right margin based on whether we're showing sum labels
  const rightMargin = showSumLabels ? 80 : 30;

  return (
    <div style={{ width: "100%", height: `${height}px` }}>
      <ChartContainer config={chartConfig} className="h-full w-full">
        <BarChart
          data={dataWithTotals}
          layout="vertical"
          margin={{ top: 5, right: rightMargin, left: 150, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: "#6B7280" }}
            tickLine={false}
            axisLine={{ stroke: "#E5E7EB" }}
            tickFormatter={(value) => formatAbbreviated(value)}
          />
          <YAxis
            type="category"
            dataKey={categoryKey}
            width={140}
            tick={{ fontSize: 11, fill: "#374151" }}
            tickLine={false}
            axisLine={{ stroke: "#E5E7EB" }}
          />
          <ChartTooltip
            content={<ChartTooltipContent />}
            cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
          />
          {dataKeys.map((key, index) => {
            const isLastBar = index === dataKeys.length - 1;
            const barColor = singleBarColor || `var(--color-${keyMapping[key]})`;

            return (
              <Bar
                key={key}
                dataKey={key}
                fill={barColor}
                stackId={stacked ? "a" : undefined}
                onClick={onBarClick ? () => onBarClick(key) : undefined}
                cursor={onBarClick ? "pointer" : "default"}
                radius={stacked ? (isLastBar ? [0, 4, 4, 0] : [0, 0, 0, 0]) : [0, 4, 4, 0]}
              >
                {/* Single bar mode: show sum for each row */}
                {showSumLabels && isSingleBar && (
                  <LabelList
                    dataKey={key}
                    position="right"
                    content={<SumLabel />}
                  />
                )}
                {/* Stacked mode: show total on the last bar segment */}
                {showSumLabels && stacked && isLastBar && !isSingleBar && (
                  <LabelList
                    dataKey="_total"
                    position="right"
                    content={<SumLabel />}
                  />
                )}
              </Bar>
            );
          })}
        </BarChart>
      </ChartContainer>
    </div>
  );
}

// Simple single-bar horizontal chart for Cost Model Analysis
interface SingleBarChartProps {
  data: Array<{ category: string; value: number }>;
  height?: number;
  color?: string;
  showSumLabels?: boolean;
  leftMargin?: number;
  yAxisWidth?: number;
}

export function SingleBarHorizontalChart({
  data,
  height = 500,
  color = "#18181B",
  showSumLabels = true,
  leftMargin = 120,
  yAxisWidth = 110,
}: SingleBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center bg-gray-50 rounded">
        <p className="text-gray-500 text-sm">No data available</p>
      </div>
    );
  }

  const chartConfig: ChartConfig = {
    value: {
      label: "Value",
      color: color,
    },
  };

  const rightMargin = showSumLabels ? 70 : 20;

  return (
    <div style={{ width: "100%", height: `${height}px` }}>
      <ChartContainer config={chartConfig} className="h-full w-full">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: rightMargin, left: leftMargin, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: "#6B7280" }}
            tickLine={false}
            axisLine={{ stroke: "#E5E7EB" }}
            tickFormatter={(value) => formatAbbreviated(value)}
          />
          <YAxis
            type="category"
            dataKey="category"
            width={yAxisWidth}
            tick={{ fontSize: 10, fill: "#374151" }}
            tickLine={false}
            axisLine={{ stroke: "#E5E7EB" }}
          />
          <ChartTooltip
            content={<ChartTooltipContent />}
            cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
          />
          <Bar
            dataKey="value"
            fill={color}
            radius={[0, 4, 4, 0]}
          >
            {showSumLabels && (
              <LabelList
                dataKey="value"
                position="right"
                content={<SumLabel />}
              />
            )}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
