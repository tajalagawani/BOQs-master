"use client";

import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_COLORS, formatAbbreviated } from "@/lib/chartColors";
import MicroChart, { MicroChartLegend } from "./MicroChart";

export interface MiniPieChartDataItem {
  name: string;
  value: number;
  color?: string;
}

interface MiniPieChartProps {
  title: string;
  data: MiniPieChartDataItem[];
  colors?: string[];
  showLabels?: boolean;
  donut?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: MiniPieChartDataItem;
  }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-white px-2 py-1 rounded shadow-lg border border-gray-200 text-xs">
        <p className="font-medium text-gray-900">{data.name}</p>
        <p className="text-gray-600">{formatAbbreviated(data.value)}</p>
      </div>
    );
  }
  return null;
};

const RADIAN = Math.PI / 180;

interface LabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}

const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: LabelProps) => {
  if (percent < 0.05) return null;

  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={10}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function MiniPieChart({
  title,
  data,
  colors = CHART_COLORS.palette,
  showLabels = true,
  donut = true,
}: MiniPieChartProps) {
  // Filter out zero values and add colors
  const chartData = data
    .filter(item => item.value > 0)
    .map((item, index) => ({
      ...item,
      color: item.color || colors[index % colors.length],
    }));

  if (chartData.length === 0) {
    return (
      <MicroChart title={title}>
        <div className="text-gray-400 text-xs">No data available</div>
      </MicroChart>
    );
  }

  // Legend items
  const legendItems = chartData.map(item => ({
    name: item.name,
    color: item.color!,
  }));

  // Determine legend columns based on item count
  const legendColumns = chartData.length <= 4 ? 2 : chartData.length <= 6 ? 3 : 4;

  return (
    <MicroChart
      title={title}
      footer={<MicroChartLegend items={legendItems} columns={legendColumns as 2 | 3 | 4} />}
    >
      <div className="w-full h-full min-h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={showLabels ? (renderLabel as unknown as undefined) : undefined}
              innerRadius={donut ? "40%" : 0}
              outerRadius="85%"
              paddingAngle={chartData.length > 5 ? 0 : 1}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke="white"
                  strokeWidth={1}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    </MicroChart>
  );
}
