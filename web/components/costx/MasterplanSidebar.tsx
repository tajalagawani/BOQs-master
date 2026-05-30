"use client";

import { Menu, X, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

export type FilterType = "all" | "created" | "shared";

interface FilterOption {
  key: FilterType;
  label: string;
}

const filterOptions: FilterOption[] = [
  { key: "all", label: "All masterplans" },
  { key: "created", label: "Created by me" },
  { key: "shared", label: "Shared with me" },
];

interface Props {
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  canCreateMasterplan: boolean;
  onStartCreate: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function MasterplanSidebar({
  filter,
  onFilterChange,
  canCreateMasterplan,
  onStartCreate,
  isOpen,
  onToggle,
}: Props) {
  return (
    <>
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={onToggle}
        className="lg:hidden fixed top-20 left-4 z-40 size-9 inline-flex items-center justify-center bg-white border border-zinc-200 rounded-lg shadow"
        aria-label="Toggle sidebar"
      >
        {isOpen ? (
          <X className="size-4" strokeWidth={1.75} />
        ) : (
          <Menu className="size-4" strokeWidth={1.75} />
        )}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-30"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:relative inset-y-0 left-0 z-40",
          "w-60 bg-white border-r border-zinc-200 flex flex-col",
          "transform transition-transform duration-200 ease-in-out lg:transform-none",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-zinc-200">
          <span className="text-sm font-semibold text-zinc-900">Filters</span>
          <button
            type="button"
            onClick={onToggle}
            className="size-8 inline-flex items-center justify-center rounded-md hover:bg-zinc-100"
          >
            <X className="size-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Filter list */}
        <nav className="p-3 space-y-0.5">
          {filterOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                onFilterChange(option.key);
                if (isOpen) onToggle();
              }}
              className={cn(
                "w-full text-left px-3 h-9 rounded-lg text-xs transition-colors flex items-center",
                filter === option.key
                  ? "bg-zinc-900 text-white font-medium"
                  : "text-zinc-700 hover:bg-zinc-100",
              )}
            >
              {option.label}
            </button>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Bottom CTA card */}
        <div className="p-3">
          <div className="rounded-xl p-4 bg-zinc-900 text-white">
            <div className="text-sm font-semibold">Masterplan Estimates</div>
            <p className="text-[11px] text-white/70 mt-1 leading-relaxed">
              {canCreateMasterplan
                ? "Create and manage masterplan estimates for your projects."
                : "View masterplan estimates assigned to you."}
            </p>
            {canCreateMasterplan && (
              <button
                type="button"
                onClick={() => {
                  onStartCreate();
                  if (isOpen) onToggle();
                }}
                className="mt-3 w-full h-8 bg-white text-zinc-900 text-xs font-medium rounded-full hover:bg-zinc-100 inline-flex items-center justify-center gap-1.5"
              >
                <Plus className="size-3.5" strokeWidth={2.25} />
                New masterplan
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
