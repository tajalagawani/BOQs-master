"use client";

import { Search, Bell, Plus, HelpCircle, ChevronDown } from "lucide-react";
import { Button } from "@/modules/rates/components/ui/button";

export function Topbar() {
  return (
    <header className="h-14 shrink-0 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20">
      <div className="h-full flex items-center gap-3 px-5">
        {/* Breadcrumb */}
        <div className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground">
          <span>Knowledge Centre</span>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-foreground font-medium">Buildings</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" />
        </div>

        {/* Search */}
        <div className="flex-1 max-w-xl mx-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search descriptions, projects, contractors…"
            className="w-full h-9 pl-9 pr-16 rounded-md border border-input bg-muted/40 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:bg-background transition-colors"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 h-5 px-1.5 rounded border bg-background text-[10px] text-muted-foreground font-mono inline-flex items-center">
            ⌘K
          </kbd>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon-sm" aria-label="Help">
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Notifications" className="relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-rose-500" />
          </Button>
          <div className="h-5 w-px bg-border mx-1" />
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New Rate
          </Button>
        </div>
      </div>
    </header>
  );
}
