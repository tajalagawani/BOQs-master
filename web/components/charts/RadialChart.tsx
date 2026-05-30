"use client";

import React from "react";
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Cell,
  PolarAngleAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/Card";
import { CHART_COLORS } from "@/lib/chartColors";

export type RadialChartData = {
  name: string;
  value: number;
  fill?: string;
};

export interface RadialChartCardProps {
  title: string;
  subtitle?: string;
  value: number;
  total: number;
  color?: string;
  className?: string;
  height?: number;
}

const formatValue = (value: number | undefined) => {
  if (value === undefined) return "0";
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

export function RadialChartCard({
  title,
  subtitle,
  value,
  total,
  color = CHART_COLORS.primary,
  className = "",
  height = 200,
}: RadialChartCardProps) {
  const chartData = [{ name: subtitle || title, value, fill: color }];
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <Card className={`bg-white ${className}`}>
      <CardContent className="p-4 pb-2">
        <h3 className="text-xs font-medium text-gray-500">{title}</h3>
        <div style={{ height: `${height}px` }} className="relative">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="70%"
              outerRadius="90%"
              barSize={12}
              data={chartData}
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis
                type="number"
                domain={[0, total]}
                angleAxisId={0}
                tick={false}
              />
              <RadialBar
                background={{ fill: "#E5E7EB" }}
                dataKey="value"
                cornerRadius={10}
                angleAxisId={0}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={color} />
                ))}
              </RadialBar>
            </RadialBarChart>
          </ResponsiveContainer>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900">
              {formatValue(value)}
            </span>
            <span className="text-xs text-gray-500">{percentage}%</span>
          </div>
        </div>
        {subtitle && (
          <p className="text-center text-xs text-gray-500 -mt-2">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

// Grid of radial charts
export interface RadialChartGridProps {
  charts: RadialChartCardProps[];
  columns?: 2 | 3 | 4 | 6;
}

export function RadialChartGrid({ charts, columns = 4 }: RadialChartGridProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
    6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4`}>
      {charts.map((chart, index) => (
        <RadialChartCard key={index} {...chart} />
      ))}
    </div>
  );
}

export default RadialChartCard;
