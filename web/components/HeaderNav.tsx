"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  PieChart,
  FolderKanban,
  TrendingUp,
  Database,
  Settings,
  Home,
} from "lucide-react";
import { cn } from "@/lib/cn";

const items = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  { href: "/boqs", label: "BOQs", icon: FileText, match: (p: string) => p.startsWith("/boqs") },
  { href: "/costx", label: "CostX", icon: PieChart, match: (p: string) => p.startsWith("/costx") },
  { href: "/projects", label: "Projects", icon: FolderKanban, match: (p: string) => p.startsWith("/projects") },
  { href: "/benchmarking", label: "Benchmarking", icon: TrendingUp, match: (p: string) => p.startsWith("/benchmarking") },
  {
    href: "/cost-model-rate-analysis",
    label: "Rate Analysis",
    icon: Database,
    match: (p: string) => p.startsWith("/cost-model-rate-analysis"),
  },
  { href: "/configuration", label: "Configuration", icon: Settings, match: (p: string) => p.startsWith("/configuration") },
];

export function HeaderNav() {
  const pathname = usePathname() || "/";
  return (
    <nav className="border-t border-zinc-200/70 bg-white/60 backdrop-blur-md">
      <div className="w-full px-5 flex items-center gap-0.5 overflow-x-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "h-10 px-3 inline-flex items-center gap-1.5 text-xs font-medium transition-colors whitespace-nowrap -mb-px border-b-2",
                active
                  ? "text-zinc-900 border-zinc-900"
                  : "text-zinc-500 hover:text-zinc-800 border-transparent",
              )}
            >
              <Icon className="size-3.5" strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
