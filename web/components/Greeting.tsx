"use client";

import { useEffect, useState } from "react";

function pickGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Good night";
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});

export function Greeting({ name }: { name: string }) {
  // Render a stable string on the server, then re-evaluate on the client
  // once we know the user's local hour. Avoids hydration mismatch.
  const [greeting, setGreeting] = useState("Hello");
  const [dateLabel, setDateLabel] = useState("");

  useEffect(() => {
    const now = new Date();
    setGreeting(pickGreeting(now.getHours()));
    setDateLabel(dateFormatter.format(now));
  }, []);

  return (
    <div className="max-w-2xl shrink-0">
      <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-500 font-medium mb-1 min-h-[14px]">
        {dateLabel}
      </div>
      {/* Font scales with viewport — fluid clamp keeps it tight on short screens. */}
      <h1 className="text-[clamp(28px,3.6vw,46px)] leading-[1.05] font-semibold tracking-tight text-zinc-900">
        {greeting}, <span className="text-zinc-900">{name}</span>
        <span style={{ color: "#60B78C" }}>.</span>
      </h1>
      <p className="mt-2 text-[12.5px] text-zinc-500 leading-relaxed max-w-lg">
        Pick up where you left off — instructions, tenders, BOQs and budgets all
        in one workspace.
      </p>
    </div>
  );
}
