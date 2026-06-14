"use client";

/**
 * 10X Suite — navigation menu in the topnav.
 * Restores the module/page navigation the old Header carried (and adds
 * Configuration, which had no entry point). A grid button on the navy bar opens
 * a dropdown of every user-facing destination, with the current one highlighted.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/cn";

const NAV: { href: string; label: string; match: (p: string) => boolean }[] = [
  { href: "/", label: "Home", match: (p) => p === "/" },
  { href: "/procurex", label: "ProcureX", match: (p) => p.startsWith("/procurex") },
  { href: "/boqs", label: "BOQsX", match: (p) => p.startsWith("/boqs") },
  { href: "/costx", label: "CostX", match: (p) => p.startsWith("/costx") },
  { href: "/rates", label: "RatesX", match: (p) => p.startsWith("/rates") },
  { href: "/projects", label: "Projects", match: (p) => p.startsWith("/projects") },
  { href: "/benchmarking", label: "Benchmarking", match: (p) => p.startsWith("/benchmarking") },
  {
    href: "/cost-model-rate-analysis",
    label: "Rate Analysis",
    match: (p) => p.startsWith("/cost-model-rate-analysis"),
  },
  { href: "/configuration", label: "Configuration", match: (p) => p.startsWith("/configuration") },
];

export function SuiteNavMenu() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Navigation menu"
        aria-expanded={open}
        className="grid size-[30px] place-items-center rounded-full bg-white/10 text-[#dfe6f2] transition-colors hover:bg-white/15"
      >
        <LayoutGrid className="size-4" strokeWidth={1.75} />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-52 rounded-xl border border-suite-line bg-white p-1.5 shadow-lg">
          {NAV.map((it) => {
            const active = it.match(pathname);
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "block rounded-md px-2.5 py-2 text-[13px] transition-colors",
                  active
                    ? "bg-suite-card-soft font-semibold text-suite-ink"
                    : "text-suite-ink-2 hover:bg-suite-card-soft hover:text-suite-ink",
                )}
              >
                {it.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
