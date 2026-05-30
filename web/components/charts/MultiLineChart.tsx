"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface Props {
  data: Array<Record<string, string | number>>;
  dataKeys: string[];
  colors: Record<string, string>;
  height?: number;
}

export default function MultiLineChart({
  data,
  dataKeys,
  colors,
  height = 400,
}: Props) {
  // Zoom state
  const [zoomStart, setZoomStart] = useState(0);
  const [zoomEnd, setZoomEnd] = useState(data.length);
  const [filteredData, setFilteredData] = useState(data);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync filtered data when data prop changes
  useEffect(() => {
    setFilteredData(data);
    setZoomStart(0);
    setZoomEnd(data.length);
  }, [data]);

  // Update filtered data when zoom changes
  useEffect(() => {
    if (data.length > 0) {
      setFilteredData(data.slice(zoomStart, zoomEnd));
    }
  }, [data, zoomStart, zoomEnd]);

  // Reset zoom
  const resetZoom = useCallback(() => {
    setZoomStart(0);
    setZoomEnd(data.length);
  }, [data.length]);

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();

    const zoomFactor = 0.1;
    const currentRange = zoomEnd - zoomStart;
    const minRange = 3; // Minimum 3 data points visible

    if (e.deltaY < 0) {
      // Zoom in (scroll up)
      const newRange = Math.max(minRange, Math.floor(currentRange * (1 - zoomFactor)));
      const rangeDiff = currentRange - newRange;
      const newStart = Math.min(data.length - newRange, zoomStart + Math.floor(rangeDiff / 2));
      const newEnd = newStart + newRange;

      setZoomStart(Math.max(0, newStart));
      setZoomEnd(Math.min(data.length, newEnd));
    } else {
      // Zoom out (scroll down)
      const newRange = Math.min(data.length, Math.ceil(currentRange * (1 + zoomFactor)));
      const rangeDiff = newRange - currentRange;
      const newStart = Math.max(0, zoomStart - Math.floor(rangeDiff / 2));
      const newEnd = Math.min(data.length, newStart + newRange);

      setZoomStart(newStart);
      setZoomEnd(newEnd);
    }
  }, [data.length, zoomStart, zoomEnd]);

  // Attach wheel event listener
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

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

  const isZoomed = zoomStart > 0 || zoomEnd < data.length;

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: `${height}px` }}
      className="relative cursor-zoom-in"
    >
      {/* Zoom Reset Button */}
      {isZoomed && (
        <button
          onClick={resetZoom}
          className="absolute top-0 right-0 z-10 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
        >
          Reset Zoom
        </button>
      )}
      <ChartContainer config={chartConfig} className="h-full w-full">
        <LineChart
          data={filteredData}
          margin={{ top: 10, right: 10, left: 0, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            interval={0}
            tick={{ fontSize: 10 }}
            height={80}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            domain={[0, 'auto']}
            tickFormatter={(value) => value.toLocaleString()}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          {dataKeys.map((key) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={`var(--color-${keyMapping[key]})`}
              strokeWidth={key === "Average" ? 3 : key === "RCDC Cost Model" ? 2 : 1.5}
              dot={{ r: key === "Average" ? 3 : key === "RCDC Cost Model" ? 2 : 1.5 }}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ChartContainer>
      <p className="text-xs text-gray-400 text-center mt-1">
        {isZoomed ? "Scroll to zoom • Click Reset to restore" : "Scroll to zoom in/out"}
      </p>
    </div>
  );
}
