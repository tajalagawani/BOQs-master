"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const items = [
  { href: "/", label: "Home", match: (p: string) => p === "/" },
  { href: "/boqs", label: "BOQs", match: (p: string) => p.startsWith("/boqs") },
  { href: "/costx", label: "ioMaster", match: (p: string) => p.startsWith("/costx") },
  { href: "/projects", label: "Projects", match: (p: string) => p.startsWith("/projects") },
  { href: "/benchmarking", label: "Benchmarking", match: (p: string) => p.startsWith("/benchmarking") },
  {
    href: "/cost-model-rate-analysis",
    label: "Rate Analysis",
    match: (p: string) => p.startsWith("/cost-model-rate-analysis"),
  },
];

/** Inline nav row inside the main header bar — only rendered inside /costx. */
export function HeaderNavInline() {
  const pathname = usePathname() || "/";
  // Spacer keeps header layout balanced on routes where the nav is hidden.
  if (!pathname.startsWith("/costx")) return <div className="flex-1" />;
  return (
    <nav className="flex-1 flex items-center justify-center gap-0.5 min-w-0 overflow-x-auto">
      {items.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "h-9 px-3 inline-flex items-center text-sm font-medium rounded-md transition-colors whitespace-nowrap",
              active
                ? "bg-white text-zinc-900 border border-zinc-200 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-white/60",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
