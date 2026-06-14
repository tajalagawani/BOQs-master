"use client";

/**
 * 10X Suite — floating assistant button (the amber `.chatbtn` in both refs).
 * Fixed bottom-right; wired to a caller-supplied handler (defaults to no-op so
 * it can ship before the assistant panel exists).
 */
import { Sparkles } from "lucide-react";

export function ChatFab({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open assistant"
      className="fixed bottom-[22px] right-[22px] z-30 grid size-[46px] place-items-center rounded-full bg-[#f3c43e] text-[#3a2f00] transition-transform hover:scale-105"
      style={{ animation: "suite-fab 2.6s ease-in-out infinite" }}
    >
      <Sparkles className="size-[22px]" strokeWidth={2} />
    </button>
  );
}
