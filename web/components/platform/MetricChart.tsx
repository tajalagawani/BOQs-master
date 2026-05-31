"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MetricPoint } from "@/lib/platform/log-analytics";

interface Props {
  data: MetricPoint[];
  /** Display unit suffix, e.g. "%", " req/s" */
  unit?: string;
  /** Optional fixed Y-axis max. If omitted, recharts auto-scales. */
  yMax?: number;
  /** Hex colour for the line + area fill. */
  color?: string;
  /** Height in pixels. */
  height?: number;
  /** Decimal places shown in tooltip. */
  precision?: number;
}

export function MetricChart({
  data,
  unit = "",
  yMax,
  color = "#10b981",
  height = 220,
  precision = 1,
}: Props) {
  if (data.length === 0) {
    return (
      <div
        className="bg-zinc-50 border border-dashed border-zinc-200 rounded-md flex items-center justify-center text-[12px] text-zinc-500"
        style={{ height }}
      >
        No data points in this window
      </div>
    );
  }

  const gradId = `grad-${color.replace("#", "")}`;
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#f4f4f5" vertical={false} />
          <XAxis
            dataKey="ts"
            tickFormatter={fmtTime}
            tick={{ fill: "#a1a1aa", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            minTickGap={36}
          />
          <YAxis
            domain={yMax != null ? [0, yMax] : undefined}
            tick={{ fill: "#a1a1aa", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}${unit}`}
            width={42}
          />
          <Tooltip
            cursor={{ stroke: "#d4d4d8", strokeDasharray: "4 4" }}
            contentStyle={{
              backgroundColor: "#18181b",
              border: "none",
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 11,
              color: "#fafafa",
            }}
            labelStyle={{ color: "#a1a1aa", fontSize: 10, marginBottom: 2 }}
            labelFormatter={fmtTooltipLabel}
            formatter={(value: number) => [`${value.toFixed(precision)}${unit}`, "Value"]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.75}
            fill={`url(#${gradId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function fmtTooltipLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
