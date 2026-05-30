"use client";

import { ConfigTab, CONFIG_TABS } from "@/types/costModel";

interface ConfigTabsProps {
  activeTab: ConfigTab;
  onTabChange: (tab: ConfigTab) => void;
}

export default function ConfigTabs({ activeTab, onTabChange }: ConfigTabsProps) {
  return (
    <div className="flex items-center gap-1 border-b border-gray-200 bg-white px-4">
      {CONFIG_TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            px-4 py-3 text-sm font-medium transition-colors relative
            ${
              activeTab === tab.id
                ? "text-zinc-900"
                : "text-gray-500 hover:text-gray-700"
            }
          `}
        >
          {tab.label}
          {activeTab === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900" />
          )}
        </button>
      ))}
    </div>
  );
}
