"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Target,
  ScrollText,
  Bug,
  GitBranch,
  CheckCircle2,
  Gauge,
  Server,
  Activity,
  History,
  Network,
  Settings,
  AlertOctagon,
} from "lucide-react";
import { cn } from "@/lib/cn";

export interface PlatformTab {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  phase: 1 | 2 | 3 | 4 | 5;
  match: (p: string) => boolean;
}

export const PLATFORM_TABS: PlatformTab[] = [
  { href: "/platform",                label: "Overview",       icon: LayoutDashboard, phase: 1, match: (p) => p === "/platform" },
  { href: "/platform/docs",           label: "Docs",           icon: BookOpen,        phase: 1, match: (p) => p.startsWith("/platform/docs") },
  { href: "/platform/kpis",           label: "KPIs",           icon: Target,          phase: 2, match: (p) => p.startsWith("/platform/kpis") },
  { href: "/platform/releases",       label: "Releases",       icon: ScrollText,      phase: 2, match: (p) => p.startsWith("/platform/releases") },
  { href: "/platform/defects",        label: "Defects",        icon: Bug,             phase: 2, match: (p) => p.startsWith("/platform/defects") },
  { href: "/platform/cicd",           label: "CI/CD",          icon: GitBranch,       phase: 3, match: (p) => p.startsWith("/platform/cicd") },
  { href: "/platform/tests",          label: "Tests",          icon: CheckCircle2,    phase: 4, match: (p) => p.startsWith("/platform/tests") },
  { href: "/platform/performance",    label: "Performance",    icon: Gauge,           phase: 4, match: (p) => p.startsWith("/platform/performance") },
  { href: "/platform/infrastructure", label: "Infrastructure", icon: Server,          phase: 3, match: (p) => p.startsWith("/platform/infrastructure") },
  { href: "/platform/monitoring",     label: "Monitoring",     icon: Activity,        phase: 3, match: (p) => p.startsWith("/platform/monitoring") },
  { href: "/platform/errors",         label: "Errors",         icon: AlertOctagon,    phase: 3, match: (p) => p.startsWith("/platform/errors") },
  { href: "/platform/audit",          label: "Audit",          icon: History,         phase: 4, match: (p) => p.startsWith("/platform/audit") },
  { href: "/platform/architecture",   label: "Architecture",   icon: Network,         phase: 5, match: (p) => p.startsWith("/platform/architecture") },
  { href: "/platform/settings",       label: "Settings",       icon: Settings,        phase: 3, match: (p) => p.startsWith("/platform/settings") },
];

export function PlatformNav() {
  const pathname = usePathname() || "/platform";
  return (
    <nav className="bg-white border-b border-zinc-200 sticky top-12 z-30">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-center gap-0.5 overflow-x-auto">
          {PLATFORM_TABS.map((t) => {
            const Icon = t.icon;
            const active = t.match(pathname);
            const live = t.phase === 1;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  "h-11 px-3 inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap transition-colors -mb-px border-b-2",
                  active
                    ? "text-zinc-900 border-zinc-900"
                    : "text-zinc-500 hover:text-zinc-900 border-transparent",
                )}
              >
                <Icon className="size-3.5" strokeWidth={1.75} />
                {t.label}
                {!live && (
                  <span className="ml-1 text-[9px] uppercase tracking-wide text-zinc-400 bg-zinc-100 border border-zinc-200 rounded-full px-1.5 py-0.5">
                    P{t.phase}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
