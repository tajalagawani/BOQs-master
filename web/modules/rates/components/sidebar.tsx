"use client";

import * as React from "react";
import {
  Building2,
  Network,
  Factory,
  Wrench,
  Trees,
  Anchor,
  Layers3,
  Drill,
  Trophy,
  Boxes,
  LineChart,
  LogOut,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/modules/rates/lib/utils";
import { SECTIONS } from "@/modules/rates/lib/schemas";

type ItemMeta = {
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
};

const ITEM_META: Record<string, ItemMeta> = {
  Buildings: { icon: Building2, accent: "bg-sky-500" },
  Infrastructure: { icon: Network, accent: "bg-slate-500" },
  Industrial: { icon: Factory, accent: "bg-orange-500" },
  "Utility Buildings": { icon: Wrench, accent: "bg-emerald-500" },
  "Public Realm": { icon: Trees, accent: "bg-lime-500" },
  Marine: { icon: Anchor, accent: "bg-blue-500" },
  Piling: { icon: Layers3, accent: "bg-amber-700" },
  "Ground Investigation": { icon: Drill, accent: "bg-rose-500" },
  Stadium: { icon: Trophy, accent: "bg-violet-500" },
  Materials: { icon: Boxes, accent: "bg-zinc-500" },
  "Market Testing Log": { icon: LineChart, accent: "bg-fuchsia-500" },
};

type Props = {
  search: string;
  onSearchChange: (v: string) => void;
  activeLabel: string;
  onActiveChange: (label: string) => void;
};

export function Sidebar({
  search,
  onSearchChange,
  activeLabel,
  onActiveChange,
}: Props) {
  return (
    <aside className="hidden lg:flex flex-col w-[210px] shrink-0 bg-card">
      {/* Search */}
      <div className="px-3 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search every column…"
            className="w-full h-8 pl-8 pr-7 rounded-md border bg-background text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 grid place-items-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 scrollbar-thin">
        <ul className="space-y-0.5">
          {SECTIONS.map(({ label }) => {
            const meta = ITEM_META[label] ?? {
              icon: Boxes,
              accent: "bg-muted-foreground/30",
            };
            const Icon = meta.icon;
            const active = label === activeLabel;
            return (
              <li key={label}>
                <button
                  onClick={() => onActiveChange(label)}
                  className={cn(
                    "w-full group flex items-center gap-2 rounded-md pl-2 pr-2 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-accent/70 text-foreground"
                      : "text-foreground/75 hover:text-foreground hover:bg-accent/40"
                  )}
                >
                  <span
                    className={cn("h-4 w-1 rounded-full shrink-0", meta.accent)}
                  />
                  <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span
                    className={cn(
                      "flex-1 text-left truncate",
                      active && "font-medium"
                    )}
                  >
                    {label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-3">
        <div className="flex items-center gap-2.5 rounded-md p-1.5 hover:bg-accent/50 transition-colors cursor-pointer">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 grid place-items-center text-[10px] font-semibold text-white">
            TA
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">Taj Alagawani</div>
            <div className="text-[10px] text-muted-foreground truncate">
              taj.alagawani@gmail.com
            </div>
          </div>
          <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>
    </aside>
  );
}
