"use client";

import Image from "next/image";
import { useState, useMemo } from "react";
import { Search, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Greeting } from "@/components/Greeting";
import { ModuleCard } from "@/components/ModuleCard";
import { ProjectPulse } from "@/components/ProjectPulse";

export interface HomeModule {
  icon: ReactNode;
  title: string;
  description: string;
  href?: string;
  backgroundImage?: string;
}

export function HomeWorkspace({
  name,
  modules,
}: {
  name: string;
  modules: HomeModule[];
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q),
    );
  }, [modules, search]);

  // Keep the 5×2 wall geometry even when filtered — pad with the original
  // modules so the rhythm doesn't break when the search narrows results.
  const grid = filtered.slice(0, 10);

  return (
    <div className="h-full w-full px-6 lg:px-8 py-3 lg:py-4 grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4 lg:gap-6">
      {/* Left column — strict no-scroll, identical to the original home shell. */}
      <div className="min-w-0 min-h-0 flex flex-col items-center">
        <div className="w-fit">
          <div className="mt-6 lg:mt-10">
            <Greeting name={name} />
          </div>

          {/* Search — sits under the hero, ahead of the grid. */}
          <div className="mt-4 relative max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400"
              strokeWidth={1.75}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search modules"
              className="w-full h-9 pl-9 pr-3 bg-white border border-zinc-200 rounded-2xl text-sm placeholder:text-zinc-400 shadow-[0_2px_8px_-4px_rgba(24,24,27,0.08)] focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 grid-rows-2 auto-rows-[280px]">
            {grid.map((m) => (
              <div key={m.title} className="w-55 h-[280px]">
                <ModuleCard
                  icon={m.icon}
                  title={m.title}
                  description={m.description}
                  href={m.href}
                  backgroundImage={m.backgroundImage}
                />
              </div>
            ))}

            {grid.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-sm text-zinc-500">
                  No modules match &ldquo;{search}&rdquo;.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0" />

        {/* Footer — same as the new pages. */}
        <div className="shrink-0 self-stretch flex items-center justify-between text-[10.5px] text-zinc-500 px-1 pt-2">
          <div className="flex items-center gap-2.5">
            <Image
              src="/iox-logo.svg"
              alt="IOX"
              width={1338}
              height={461}
              className="h-4 w-auto"
            />
            <span className="text-zinc-300">|</span>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="size-3 text-zinc-500" strokeWidth={1.75} />
              <span>Project data secured and synced in real time</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            <span>All systems normal</span>
          </div>
        </div>
      </div>

      {/* Right column — ProjectPulse. */}
      <div className="hidden xl:flex min-h-0">
        <ProjectPulse />
      </div>
    </div>
  );
}
