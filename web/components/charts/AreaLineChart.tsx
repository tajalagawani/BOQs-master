"use client";

import {
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { CHART_COLORS, formatAbbreviated } from "@/lib/chartColors";

export interface AreaLineChartDataItem {
  date: string;
  [key: string]: string | number;
}

interface SeriesConfig {
  dataKey: string;
  name: string;
  color: string;
  type: "area" | "line" | "bar";
  yAxisId?: "left" | "right";
  stackId?: string;
}

interface AreaLineChartProps {
  data: AreaLineChartDataItem[];
  series: SeriesConfig[];
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  xAxisDataKey?: string;
  leftAxisLabel?: string;
  rightAxisLabel?: string;
  showRightAxis?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200">
        <p className="text-sm font-medium text-gray-900 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.name}:</span>
            <span className="font-medium text-gray-900">
              {formatAbbreviated(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function AreaLineChart({
  data,
  series,
  height = 400,
  showLegend = true,
  showGrid = true,
  xAxisDataKey = "date",
  leftAxisLabel,
  rightAxisLabel,
  showRightAxis = false,
}: AreaLineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-400 text-sm"
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 10, right: showRightAxis ? 60 : 20, left: 20, bottom: 10 }}
        >
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.gray[200]} />
          )}

          <XAxis
            dataKey={xAxisDataKey}
            tick={{ fontSize: 10, fill: CHART_COLORS.gray[500] }}
            tickLine={false}
            axisLine={{ stroke: CHART_COLORS.gray[300] }}
            angle={-45}
            textAnchor="end"
            height={60}
          />

          <YAxis
            yAxisId="left"
            tick={{ fontSize: 10, fill: CHART_COLORS.gray[500] }}
            tickLine={false}
            axisLine={{ stroke: CHART_COLORS.gray[300] }}
            tickFormatter={(value) => formatAbbreviated(value)}
            label={
              leftAxisLabel
                ? {
                    value: leftAxisLabel,
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 10, fill: CHART_COLORS.gray[500] },
                  }
                : undefined
            }
          />

          {showRightAxis && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: CHART_COLORS.gray[500] }}
              tickLine={false}
              axisLine={{ stroke: CHART_COLORS.gray[300] }}
              tickFormatter={(value) => formatAbbreviated(value)}
              label={
                rightAxisLabel
                  ? {
                      value: rightAxisLabel,
                      angle: 90,
                      position: "insideRight",
                      style: { fontSize: 10, fill: CHART_COLORS.gray[500] },
                    }
                  : undefined
              }
            />
          )}

          <Tooltip content={<CustomTooltip />} />

          {showLegend && (
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
              iconType="square"
              iconSize={10}
            />
          )}

          {series.map((s) => {
            const yAxisId = s.yAxisId || "left";

            if (s.type === "area") {
              return (
                <Area
                  key={s.dataKey}
                  type="monotone"
                  dataKey={s.dataKey}
                  name={s.name}
                  fill={s.color}
                  stroke={s.color}
                  fillOpacity={0.3}
                  strokeWidth={2}
                  yAxisId={yAxisId}
                  stackId={s.stackId}
                />
              );
            }

            if (s.type === "line") {
              return (
                <Line
                  key={s.dataKey}
                  type="monotone"
                  dataKey={s.dataKey}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={false}
                  yAxisId={yAxisId}
                />
              );
            }

            if (s.type === "bar") {
              return (
                <Bar
                  key={s.dataKey}
                  dataKey={s.dataKey}
                  name={s.name}
                  fill={s.color}
                  yAxisId={yAxisId}
                  stackId={s.stackId}
                  barSize={20}
                />
              );
            }

            return null;
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// Pre-configured Cost Trend Chart
interface CostTrendChartData {
  date: string;
  phase1SCurve: number;
  phase2SCurve: number;
  sCurveTotal: number;
  phase1Cost: number;
  phase2Cost: number;
  [key: string]: string | number;
}

interface CostTrendChartProps {
  data: CostTrendChartData[];
  height?: number;
  showLegend?: boolean;
}

export function CostTrendChart({
  data,
  height = 350,
  showLegend = true,
}: CostTrendChartProps) {
  const series: SeriesConfig[] = [
    {
      dataKey: "phase1SCurve",
      name: "Phase 1 S-Curve",
      color: CHART_COLORS.phase1SCurve,
      type: "area",
      yAxisId: "right",
    },
    {
      dataKey: "phase2SCurve",
      name: "Phase 2 S-Curve",
      color: CHART_COLORS.phase2SCurve,
      type: "area",
      yAxisId: "right",
    },
    {
      dataKey: "sCurveTotal",
      name: "S-Curve",
      color: "#1a1a1a",
      type: "line",
      yAxisId: "right",
    },
    {
      dataKey: "phase1Cost",
      name: "Phase 1 Cost",
      color: CHART_COLORS.phase1Cost,
      type: "bar",
      yAxisId: "left",
    },
    {
      dataKey: "phase2Cost",
      name: "Phase 2 Cost",
      color: CHART_COLORS.phase2Cost,
      type: "bar",
      yAxisId: "left",
    },
  ];

  return (
    <AreaLineChart
      data={data}
      series={series}
      height={height}
      showLegend={showLegend}
      showRightAxis={true}
      leftAxisLabel=""
      rightAxisLabel=""
    />
  );
}
