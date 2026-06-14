"use client";

import { ConfigTab, CONFIG_TABS } from "@/types/costModel";

interface ConfigTabsProps {
  activeTab: ConfigTab;
  onTabChange: (tab: ConfigTab) => void;
}

export default function ConfigTabs({ activeTab, onTabChange }: ConfigTabsProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto px-6">
      {CONFIG_TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            px-4 py-3 text-[13px] font-medium transition-colors relative whitespace-nowrap
            ${
              activeTab === tab.id
                ? "text-suite-ink"
                : "text-suite-ink-3 hover:text-suite-ink-2"
            }
          `}
        >
          {tab.label}
          {activeTab === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-suite-navy" />
          )}
        </button>
      ))}
    </div>
  );
}
