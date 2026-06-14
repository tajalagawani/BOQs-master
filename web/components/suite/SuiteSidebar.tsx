"use client";

/**
 * 10X Suite — left navigation sidebar (sub-app layouts: Platform, etc.).
 * Sectioned nav with active highlight, suite-token styled. Port of the zinc
 * PlatformSidebar into the design system.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SuiteNavItem {
  href: string;
  label: string;
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
  match?: (p: string) => boolean;
}
export interface SuiteNavSection {
  title?: string;
  items: SuiteNavItem[];
}

export function SuiteSidebar({
  sections,
  footer,
  width = 212,
}: {
  sections: SuiteNavSection[];
  footer?: ReactNode;
  width?: number;
}) {
  const pathname = usePathname() || "/";
  return (
    <aside
      className="hidden shrink-0 flex-col overflow-y-auto border-r border-suite-line bg-white md:flex"
      style={{ width }}
    >
      <nav className="flex-1 space-y-4 px-2 py-3">
        {sections.map((section, i) => (
          <div key={section.title ?? i}>
            {section.title && (
              <div className="mb-1 px-2 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-suite-ink-4">
                {section.title}
              </div>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = item.match
                  ? item.match(pathname)
                  : pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "relative flex h-8 items-center gap-2 rounded-md px-2.5 text-[12.5px] font-medium transition-colors",
                        active
                          ? "bg-suite-card-soft text-suite-ink"
                          : "text-suite-ink-2 hover:bg-suite-card-soft hover:text-suite-ink",
                      )}
                    >
                      {active && (
                        <span className="absolute bottom-1.5 left-0 top-1.5 w-0.5 rounded-full bg-suite-navy" />
                      )}
                      {Icon && (
                        <Icon
                          className={cn(
                            "size-3.5 shrink-0",
                            active ? "text-suite-navy" : "text-suite-ink-3",
                          )}
                          strokeWidth={1.75}
                        />
                      )}
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      {footer && (
        <div className="border-t border-suite-line px-4 py-3 text-[10.5px] leading-snug text-suite-ink-4">
          {footer}
        </div>
      )}
    </aside>
  );
}
