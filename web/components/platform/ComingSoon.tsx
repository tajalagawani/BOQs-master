import Link from "next/link";
import { Hammer, ArrowLeft } from "lucide-react";

interface Props {
  title: string;
  phase: 2 | 3 | 4 | 5;
  description: string;
  bullets?: string[];
}

export function ComingSoon({ title, phase, description, bullets }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="bg-white border border-zinc-200 rounded-2xl p-8 text-center">
        <div className="size-12 mx-auto rounded-xl bg-amber-50 ring-1 ring-amber-100 inline-flex items-center justify-center text-amber-700">
          <Hammer className="size-5" strokeWidth={1.75} />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-zinc-900">{title}</h1>
        <p className="mt-2 text-[12.5px] text-zinc-500 leading-relaxed max-w-xl mx-auto">
          {description}
        </p>
        <div className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
          Phase {phase}
        </div>
        {bullets && bullets.length > 0 && (
          <ul className="mt-6 mx-auto max-w-md text-left text-[12.5px] text-zinc-700 space-y-1.5">
            {bullets.map((b, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-zinc-400">•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/platform"
          className="mt-8 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white text-[12.5px] font-medium"
        >
          <ArrowLeft className="size-3.5" strokeWidth={2} /> Back to overview
        </Link>
      </div>
    </div>
  );
}
