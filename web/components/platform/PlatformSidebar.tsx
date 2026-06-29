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
  History,
  Network,
  Settings,
  AlertOctagon,
  MessageSquare,
  Users,
  FlaskConical,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  match: (p: string) => boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const PLATFORM_SECTIONS: NavSection[] = [
  {
    title: "Workspace",
    items: [
      { href: "/platform",      label: "Overview", icon: LayoutDashboard, match: (p) => p === "/platform" },
      { href: "/platform/docs", label: "Docs",     icon: BookOpen,        match: (p) => p.startsWith("/platform/docs") },
    ],
  },
  {
    title: "Status",
    items: [
      { href: "/platform/kpis",     label: "KPIs",     icon: Target,     match: (p) => p.startsWith("/platform/kpis") },
      { href: "/platform/releases", label: "Releases", icon: ScrollText, match: (p) => p.startsWith("/platform/releases") },
      { href: "/platform/defects",  label: "Defects",  icon: Bug,        match: (p) => p.startsWith("/platform/defects") },
    ],
  },
  {
    title: "Engineering",
    items: [
      { href: "/platform/cicd",           label: "CI/CD",          icon: GitBranch,    match: (p) => p.startsWith("/platform/cicd") },
      { href: "/platform/tests",          label: "Tests",          icon: CheckCircle2, match: (p) => p.startsWith("/platform/tests") },
      { href: "/platform/performance",    label: "Performance",    icon: Gauge,        match: (p) => p.startsWith("/platform/performance") },
      { href: "/platform/errors",         label: "Errors",         icon: AlertOctagon, match: (p) => p.startsWith("/platform/errors") },
    ],
  },
  {
    title: "Activity & Reference",
    items: [
      { href: "/platform/audit",        label: "Audit",        icon: History, match: (p) => p.startsWith("/platform/audit") },
      { href: "/platform/architecture", label: "Architecture", icon: Network, match: (p) => p.startsWith("/platform/architecture") },
    ],
  },
  {
    title: "Admin",
    items: [
      { href: "/platform/users",         label: "Users & Roles",  icon: Users,         match: (p) => p.startsWith("/platform/users") },
      { href: "/platform/sso-orgs",      label: "SSO Orgs",       icon: KeyRound,      match: (p) => p.startsWith("/platform/sso-orgs") },
      { href: "/platform/ai-experiment", label: "AI Experiment",  icon: FlaskConical,  match: (p) => p.startsWith("/platform/ai-experiment") },
      { href: "/platform/feedback",      label: "AI Feedback",    icon: MessageSquare, match: (p) => p.startsWith("/platform/feedback") },
      { href: "/platform/settings", label: "Settings",      icon: Settings,      match: (p) => p.startsWith("/platform/settings") },
    ],
  },
];

export function PlatformSidebar() {
  const pathname = usePathname() || "/platform";
  return (
    <aside className="hidden md:flex w-[212px] shrink-0 flex-col overflow-y-auto">
      {/* Sidebar brand block — visually hidden via opacity-0 because the
          same label now also appears in the Header `brand` slot. Keeping
          the markup preserves vertical spacing + screen-reader text. */}
      <div className="px-4 py-4 border-b border-zinc-100 opacity-0" aria-hidden="true">
        <div className="text-[10.5px] uppercase tracking-[0.12em] text-zinc-400 font-semibold">
          IOX
        </div>
        <div className="text-[13px] font-semibold text-zinc-900 mt-0.5">Platform</div>
        <div className="text-[10.5px] text-zinc-500 mt-0.5">
          Internal control plane
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-4">
        {PLATFORM_SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="px-2 mb-1 text-[9.5px] uppercase tracking-[0.12em] text-zinc-400 font-semibold">
              {section.title}
            </div>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = item.match(pathname);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "h-8 px-2.5 flex items-center gap-2 rounded-md text-[12.5px] font-medium transition-colors relative",
                        active
                          ? "bg-zinc-100 text-zinc-900"
                          : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50",
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-zinc-900" />
                      )}
                      <Icon
                        className={cn(
                          "size-3.5 shrink-0",
                          active ? "text-zinc-900" : "text-zinc-500",
                        )}
                        strokeWidth={1.75}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-zinc-100 text-[10.5px] text-zinc-400 leading-snug">
        <div className="flex items-center gap-1.5">
          <span className="relative inline-flex size-1.5">
            <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-50" />
            <span className="relative size-1.5 rounded-full bg-emerald-500" />
          </span>
          Live · UAE North
        </div>
        <div className="mt-0.5">iox-vm-01 · D2s_v3</div>
      </div>
    </aside>
  );
}
