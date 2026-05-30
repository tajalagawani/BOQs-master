import Link from "next/link";
import Image from "next/image";
import { Bell, ChevronDown, HelpCircle, Search } from "lucide-react";
import { HeaderNavInline } from "@/components/HeaderNav";

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-[#f0f3fa] border-b border-zinc-200">
      <div className="w-full px-5 h-14 flex items-center gap-3">
        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0 mr-1" aria-label="IOX home">
          <Image
            src="/iox-logo.svg"
            alt="IOX"
            width={1338}
            height={461}
            priority
            className="h-5 w-auto"
          />
        </Link>

        {/* Inline menu — replaces the old search input */}
        <HeaderNavInline />

        {/* Search icon (opens command palette) */}
        <button
          type="button"
          aria-label="Search"
          className="size-9 inline-flex items-center justify-center rounded-md hover:bg-zinc-100 transition-colors shrink-0"
        >
          <Search className="size-4.5 text-zinc-700" strokeWidth={1.75} />
        </button>

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
