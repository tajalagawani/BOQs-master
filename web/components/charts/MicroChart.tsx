"use client";

import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/Card";

interface MicroChartProps {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export default function MicroChart({
  title,
  children,
  footer,
  className = ""
}: MicroChartProps) {
  return (
    <Card className={`bg-white h-full flex flex-col ${className}`}>
      <CardContent className="p-4 flex flex-col h-full">
        {/* Header */}
        <h3 className="text-xs font-semibold text-gray-900 mb-2 flex-shrink-0">
          {title}
        </h3>

        {/* Body - Chart area */}
        <div className="flex-1 flex items-center justify-center min-h-[150px]">
          {children}
        </div>

        {/* Footer - Legend/Details */}
        {footer && (
          <div className="flex-shrink-0 mt-2 pt-2 border-t border-gray-100">
            {footer}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Legend component for the footer
interface LegendItem {
  name: string;
  color: string;
  value?: number | string;
}

interface MicroChartLegendProps {
  items: LegendItem[];
  columns?: 2 | 3 | 4;
}

export function MicroChartLegend({ items, columns = 2 }: MicroChartLegendProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-x-3 gap-y-1.5`}>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1.5 min-w-0">
          <div
            className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-[10px] text-gray-600 truncate" title={item.name}>
            {item.name}
          </span>
        </div>
      ))}
    </div>
  );
}
