import { Bell, ChevronDown, HelpCircle, Building2, Search } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-[var(--background)]/85 backdrop-blur-md border-b border-zinc-200">
      <div className="w-full px-5 h-14 flex items-center gap-3">
        {/* Logo */}
        <div className="flex items-center shrink-0 mr-1">
          <span className="text-xl font-extrabold tracking-tight text-zinc-900">
            IOX
          </span>
        </div>

        {/* Project selector */}
        <button
          type="button"
          className="flex items-center gap-2 px-3 h-9 bg-white border border-zinc-200 rounded-lg hover:border-zinc-400 transition-colors shrink-0"
        >
          <Building2 className="size-4 text-zinc-700" strokeWidth={1.75} />
          <span className="text-sm font-medium text-zinc-900">
            Skyline Tower
          </span>
          <ChevronDown className="size-4 text-zinc-500" strokeWidth={1.75} />
        </button>

        {/* Search */}
        <div className="flex-1 relative max-w-[640px] mx-auto">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400"
            strokeWidth={1.75}
          />
          <input
            type="text"
            placeholder="Search across projects, documents, costs, BOQs…"
            className="w-full h-9 pl-10 pr-14 bg-white border border-zinc-200 rounded-lg text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-500 bg-zinc-100 border border-zinc-200 rounded px-1.5 py-0.5">
            ⌘ K
          </kbd>
        </div>

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative size-9 inline-flex items-center justify-center rounded-md hover:bg-zinc-100 transition-colors shrink-0"
        >
          <Bell className="size-4.5 text-zinc-700" strokeWidth={1.75} />
          <span className="absolute top-1 right-1 size-3.5 bg-zinc-900 text-white text-[9px] font-medium rounded-full inline-flex items-center justify-center">
            3
          </span>
        </button>

        {/* Help */}
        <button
          type="button"
          aria-label="Help"
          className="size-9 inline-flex items-center justify-center rounded-md hover:bg-zinc-100 transition-colors shrink-0"
        >
          <HelpCircle className="size-4.5 text-zinc-700" strokeWidth={1.75} />
        </button>

        {/* User */}
        <div className="flex items-center gap-2 pl-2 shrink-0">
          <div className="size-9 rounded-full bg-zinc-200 inline-flex items-center justify-center text-zinc-700 font-medium text-xs">
            AM
          </div>
          <div className="hidden md:block leading-tight">
            <div className="text-xs font-semibold text-zinc-900">
              Arjun Mehta
            </div>
            <div className="text-[10.5px] text-zinc-500">Project Manager</div>
          </div>
          <ChevronDown className="size-3.5 text-zinc-500" strokeWidth={1.75} />
        </div>
      </div>
    </header>
  );
}
