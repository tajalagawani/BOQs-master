"use client";

/**
 * 10X Suite — navy top navigation bar.
 * Port of the `.topnav` in both reference designs: waffle mark + mono wordmark,
 * optional breadcrumb, centered pill search, notification/globe/platform icon
 * buttons, and the account avatar (AccountMenu, dark-tuned).
 */
import Link from "next/link";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import { Bell, Globe, LayoutDashboard, Search } from "lucide-react";
import { AccountMenu } from "@/components/AccountMenu";
import { SuiteNavMenu } from "./SuiteNavMenu";

interface SuiteTopNavProps {
  /** Controlled search value. Omit both to let the topnav manage its own. */
  search?: string;
  onSearch?: (v: string) => void;
  searchPlaceholder?: string;
  /** Optional breadcrumb after the wordmark (inner-app pages). */
  crumb?: ReactNode;
  /** Unread notification count rendered on the bell badge. */
  notifications?: number;
  /** Wordmark text. Defaults to the product brand. */
  brand?: string;
}

export function SuiteTopNav({
  search: searchProp,
  onSearch: onSearchProp,
  searchPlaceholder = "Search projects, applications, reports…",
  crumb,
  notifications = 0,
  brand = "IOX",
}: SuiteTopNavProps) {
  // Uncontrolled fallback so layouts/pages with no page-level search still work.
  const [internalSearch, setInternalSearch] = useState("");
  const search = searchProp ?? internalSearch;
  const onSearch = onSearchProp ?? setInternalSearch;
  return (
    // Sticky, self-contained navy bar (owns its background so it reads correctly
    // over both the navy hero and light inner-page surfaces). Sticks to the top
    // of the scroll container for the whole page.
    <div className="sticky top-0 z-40 flex items-center gap-4 bg-suite-navy px-6 py-2 shadow-[0_4px_16px_-10px_rgba(0,0,0,0.55)]">
      <Link href="/" className="flex items-center shrink-0" aria-label={`${brand} home`}>
        {/* Black source logo inverted to white so it reads on the navy bar. */}
        <Image
          src="/iox-logo.svg"
          alt={brand}
          width={67}
          height={40}
          priority
          className="h-[18px] w-auto"
          style={{ filter: "brightness(0) invert(1)" }}
        />
      </Link>

      {crumb && (
        <div className="hidden items-center gap-3 md:flex">
          {/* Slim divider between the logo and the app/module name. */}
          <span className="h-5 w-px bg-white/15" aria-hidden />
          <span className="flex items-center gap-2 text-[12.5px] text-[#9aa6bd]">
            {crumb}
          </span>
        </div>
      )}

      {/* Module/page navigation (Home, modules, Benchmarking, Configuration…) */}
      <SuiteNavMenu />

      <span className="flex-1" />

      {/* Search — translucent pill on the navy bar. */}
      <div className="flex h-[34px] flex-[0_1_420px] items-center gap-2.5 rounded-full border border-white/12 bg-white/10 px-4">
        <Search className="size-4 text-[#9aa6bd]" strokeWidth={1.75} />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-[#eaeef6] outline-none placeholder:text-[#8a96ad]"
        />
      </div>

      <span className="flex-1" />

      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          aria-label="Notifications"
          className="relative grid size-[30px] place-items-center rounded-full bg-white/10 text-[#dfe6f2] transition-colors hover:bg-white/15"
        >
          <Bell className="size-4" strokeWidth={1.75} />
          {notifications > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-[15px] min-w-[15px] place-items-center rounded-lg border-2 border-suite-navy bg-suite-red px-1 text-[9px] font-semibold text-white">
              {notifications}
            </span>
          )}
        </button>

        <Link
          href="/platform"
          aria-label="Platform dashboard"
          title="Platform dashboard"
          className="grid size-[30px] place-items-center rounded-full bg-white/10 text-[#dfe6f2] transition-colors hover:bg-white/15"
        >
          <LayoutDashboard className="size-4" strokeWidth={1.75} />
        </Link>

        <button
          type="button"
          aria-label="Language"
          className="grid size-[30px] place-items-center rounded-full bg-white/10 text-[#dfe6f2] transition-colors hover:bg-white/15"
        >
          <Globe className="size-4" strokeWidth={1.75} />
        </button>

        <AccountMenu variant="onDark" />
      </div>
    </div>
  );
}
