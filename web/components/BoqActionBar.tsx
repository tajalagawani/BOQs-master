"use client";

import Link from "next/link";
import { Plus, Upload, History, SlidersHorizontal, ChevronDown, MoreVertical } from "lucide-react";

export function BoqActionBar() {
  return (
    <div className="flex items-end justify-between gap-4 shrink-0">
      <div>
        <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-zinc-900">
          BOQs Management
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Create, manage, and version BOQs with ease and accuracy.
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          className="h-10 px-4 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-900 hover:border-zinc-400 inline-flex items-center gap-2"
        >
          <Plus className="size-4" strokeWidth={1.75} />
          Add Item
        </button>
        <Link
          href="/boqs/import"
          className="h-10 px-4 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-900 hover:border-zinc-400 inline-flex items-center gap-2"
        >
          <Upload className="size-4" strokeWidth={1.75} />
          Import
        </Link>
        <button
          type="button"
          className="h-10 px-4 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-900 hover:border-zinc-400 inline-flex items-center gap-2"
        >
          <History className="size-4" strokeWidth={1.75} />
          Version History
        </button>
        <button
          type="button"
          className="h-10 px-4 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-900 hover:border-zinc-400 inline-flex items-center gap-2"
        >
          <SlidersHorizontal className="size-4" strokeWidth={1.75} />
          Filters
        </button>

        <div className="ml-2 flex flex-col items-end">
          <span className="text-[10.5px] uppercase tracking-wide text-zinc-500 mb-1">
            BOQ Version
          </span>
          <button
            type="button"
            className="h-10 px-3 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-900 hover:border-zinc-400 inline-flex items-center gap-2 w-[180px] justify-between"
          >
            <span>v2.1 (Current)</span>
            <ChevronDown className="size-4 text-zinc-500" strokeWidth={1.75} />
          </button>
        </div>

        <button
          type="button"
          aria-label="More"
          className="size-10 bg-white border border-zinc-200 rounded-xl inline-flex items-center justify-center hover:border-zinc-400"
        >
          <MoreVertical className="size-4 text-zinc-700" />
        </button>
      </div>
    </div>
  );
}
