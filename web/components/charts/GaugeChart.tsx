"use client";

import { CHART_COLORS } from "@/lib/chartColors";

interface GaugeChartProps {
  actualValue: number;
  targetValue: number;
  label?: string;
  min?: number;
  max?: number;
  height?: number;
  showTarget?: boolean;
}

export default function GaugeChart({
  actualValue,
  targetValue,
  label = "FAR",
  min = 0,
  max = 1,
  height = 200,
  showTarget = true,
}: GaugeChartProps) {
  // Calculate percentages for positioning
  const range = max - min;
  const actualPercent = Math.min(Math.max((actualValue - min) / range, 0), 1);
  const targetPercent = Math.min(Math.max((targetValue - min) / range, 0), 1);

  // SVG dimensions
  const width = 200;
  const svgHeight = 120;
  const centerX = width / 2;
  const centerY = 100;
  const radius = 80;
  const strokeWidth = 20;

  // Calculate arc angles (180 degrees = semi-circle)
  const startAngle = Math.PI;
  const endAngle = 0;
  const actualAngle = startAngle - actualPercent * Math.PI;
  const targetAngle = startAngle - targetPercent * Math.PI;

  // Helper to create arc path
  const createArc = (startA: number, endA: number, r: number) => {
    const startX = centerX + r * Math.cos(startA);
    const startY = centerY - r * Math.sin(startA);
    const endX = centerX + r * Math.cos(endA);
    const endY = centerY - r * Math.sin(endA);
    const largeArc = Math.abs(endA - startA) > Math.PI ? 1 : 0;

    return `M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`;
  };

  // Create gradient segments for the gauge
  const segments = [
    { color: CHART_COLORS.primary, start: 0, end: 0.33 },
    { color: CHART_COLORS.primaryLight, start: 0.33, end: 0.66 },
    { color: '#4ECDC4', start: 0.66, end: 1 },
  ];

  // Calculate needle position
  const needleAngle = startAngle - actualPercent * Math.PI;
  const needleLength = radius - 10;
  const needleX = centerX + needleLength * Math.cos(needleAngle);
  const needleY = centerY - needleLength * Math.sin(needleAngle);

  // Target marker position
  const targetMarkerLength = radius + 5;
  const targetX = centerX + targetMarkerLength * Math.cos(targetAngle);
  const targetY = centerY - targetMarkerLength * Math.sin(targetAngle);

  return (
    <div className="flex flex-col items-center" style={{ height }}>
      <svg width={width} height={svgHeight} viewBox={`0 0 ${width} ${svgHeight}`}>
        {/* Background arc */}
        <path
          d={createArc(startAngle, endAngle, radius)}
          fill="none"
          stroke={CHART_COLORS.gray[200]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Colored segments */}
        {segments.map((segment, index) => {
          const segStartAngle = startAngle - segment.start * Math.PI;
          const segEndAngle = startAngle - Math.min(segment.end, actualPercent) * Math.PI;

          if (actualPercent <= segment.start) return null;

          const effectiveStart = Math.max(segment.start, 0);
          const effectiveEnd = Math.min(segment.end, actualPercent);

          if (effectiveEnd <= effectiveStart) return null;

          return (
            <path
              key={index}
              d={createArc(
                startAngle - effectiveStart * Math.PI,
                startAngle - effectiveEnd * Math.PI,
                radius
              )}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeLinecap={index === 0 ? "round" : "butt"}
            />
          );
        })}

        {/* Filled arc up to actual value */}
        <path
          d={createArc(startAngle, actualAngle, radius)}
          fill="none"
          stroke={CHART_COLORS.primary}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Target marker */}
        {showTarget && (
          <>
            <line
              x1={centerX + (radius - strokeWidth / 2 - 5) * Math.cos(targetAngle)}
              y1={centerY - (radius - strokeWidth / 2 - 5) * Math.sin(targetAngle)}
              x2={centerX + (radius + strokeWidth / 2 + 5) * Math.cos(targetAngle)}
              y2={centerY - (radius + strokeWidth / 2 + 5) * Math.sin(targetAngle)}
              stroke={CHART_COLORS.gray[700]}
              strokeWidth={2}
            />
            <text
              x={targetX}
              y={targetY - 10}
              textAnchor="middle"
              fontSize={9}
              fill={CHART_COLORS.gray[500]}
            >
              Target
            </text>
          </>
        )}

        {/* Needle */}
        <line
          x1={centerX}
          y1={centerY}
          x2={needleX}
          y2={needleY}
          stroke={CHART_COLORS.gray[800]}
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* Center circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={8}
          fill={CHART_COLORS.gray[800]}
        />
        <circle
          cx={centerX}
          cy={centerY}
          r={4}
          fill="white"
        />

        {/* Scale labels */}
        <text
          x={centerX - radius - 10}
          y={centerY + 5}
          textAnchor="middle"
          fontSize={10}
          fill={CHART_COLORS.gray[500]}
        >
          {min}
        </text>
        <text
          x={centerX + radius + 10}
          y={centerY + 5}
          textAnchor="middle"
          fontSize={10}
          fill={CHART_COLORS.gray[500]}
        >
          {max}
        </text>
      </svg>

      {/* Values display */}
      <div className="flex flex-col items-center mt-2 space-y-1">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Actual {label}:</span>
            <span className="font-semibold text-gray-900">{actualValue.toFixed(3)}</span>
          </div>
        </div>
        {showTarget && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Target {label}:</span>
            <span className="font-semibold text-gray-900">{targetValue.toFixed(3)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
