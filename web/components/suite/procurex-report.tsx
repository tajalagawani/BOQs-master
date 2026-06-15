/**
 * 10X Suite — ioProcure report & PTC micro-components.
 * Pixel-faithful ports of procurex-step6-10x-style.html, in suite tokens.
 * Atoms/molecules are width-agnostic; multi-column organisms own an
 * `@container` and reflow by container width (responsive by themselves).
 */
import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import { CodeBadge } from "./primitives";

/* ════════════════════════ ATOMS ════════════════════════ */

/** Inline blue code chip — addenda refs etc. (`.codei`). */
export function CodeInline({ children }: { children: ReactNode }) {
  return (
    <span className="suite-num inline-block rounded-md border border-[#d6e2f7] bg-suite-blue-soft px-1.5 py-px text-[10px] font-semibold text-suite-navy-2">
      {children}
    </span>
  );
}

/** PTE / internal lock badge (`.internal`). Label optional (lock-only form). */
export function InternalBadge({ label }: { label?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-suite-navy-2 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.05em] text-[#cdd6e6]">
      <Lock className="size-2.5" strokeWidth={2} />
      {label}
    </span>
  );
}

/** Variance text — up=worse(red), down=better(green), flat=muted (`.up/.dn`). */
export function Delta({
  dir,
  children,
}: {
  dir: "up" | "down" | "flat";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "font-semibold",
        dir === "up"
          ? "text-suite-dang"
          : dir === "down"
            ? "text-suite-good"
            : "text-suite-ink-4",
      )}
    >
      {children}
    </span>
  );
}

/** Mono bold rank number (`.rk`). */
export function Rank({ children }: { children: ReactNode }) {
  return <span className="suite-num font-bold text-suite-ink">{children}</span>;
}

/* ════════════════════════ MOLECULES ════════════════════════ */

/** Plain bold tender-sum cell (`.sum`). */
export function Sum({ children }: { children: ReactNode }) {
  return <span className="suite-num text-[13.5px] font-semibold text-suite-ink">{children}</span>;
}

/** Adjusted sum + delta (`.adj`). */
export function Adj({
  value,
  delta,
  deltaDir = "flat",
}: {
  value: ReactNode;
  delta?: ReactNode;
  deltaDir?: "up" | "down" | "flat";
}) {
  return (
    <span className="suite-num text-[11.5px] text-suite-ink-2">
      {value}
      {delta != null && (
        <span
          className={cn(
            "ml-1 text-[10px]",
            deltaDir === "down"
              ? "text-suite-good"
              : deltaDir === "up"
                ? "text-suite-dang"
                : "text-suite-ink-4",
          )}
        >
          {delta}
        </span>
      )}
    </span>
  );
}

export interface HCardProps {
  k: ReactNode;
  who?: { code: ReactNode; name: ReactNode };
  v?: ReactNode;
  vs?: ReactNode;
  lead?: boolean;
}
/** Headline summary card (`.hcard` / `.lead`). */
export function HCard({ k, who, v, vs, lead }: HCardProps) {
  return (
    <div
      className={cn(
        "rounded-[14px] border px-4 py-3.5",
        lead ? "border-[#cfe6d6] bg-suite-green-soft" : "border-suite-line bg-suite-card-soft",
      )}
    >
      <div className="mb-2 text-[9.5px] font-medium uppercase tracking-[0.06em] text-suite-ink-4">
        {k}
      </div>
      {who && (
        <div className="mb-[7px] flex items-center gap-2">
          <CodeBadge>{who.code}</CodeBadge>
          <span className="text-[14px] font-bold text-suite-ink">{who.name}</span>
        </div>
      )}
      {v != null && <div className="suite-num text-[18px] font-semibold text-suite-ink">{v}</div>}
      {vs && <div className="mt-1 text-[11px] text-suite-ink-3">{vs}</div>}
    </div>
  );
}

/** Conclusions gate cell (`.gbox`). */
export function GBox({ k, children }: { k: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-[14px] border border-suite-line bg-suite-card-soft px-4 py-3.5">
      <div className="mb-[7px] text-[9.5px] font-medium uppercase tracking-[0.06em] text-suite-ink-4">
        {k}
      </div>
      <div className="text-[14px] font-bold text-suite-ink">{children}</div>
    </div>
  );
}

/** PTC round timeline card (`.ptcr` / `.active`). */
export function PtcRoundCard({
  title,
  status,
  sub,
  sub2,
  active,
}: {
  title: ReactNode;
  status?: ReactNode;
  sub?: ReactNode;
  sub2?: ReactNode;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[14px] border px-[15px] py-3.5",
        active ? "border-[#d6e2f7] bg-suite-blue-soft" : "border-suite-line bg-suite-card-soft",
      )}
    >
      <div className="mb-2 flex items-center gap-2 text-[13px] font-bold text-suite-ink">
        {title}
        {status}
      </div>
      {sub && <div className="mt-2 text-[11px] text-suite-ink-3">{sub}</div>}
      {sub2 && <div className="mt-1.5 text-[10.5px] text-suite-ink-4">{sub2}</div>}
    </div>
  );
}

/** Hero segmented control (`.seg`) — white-on-navy. */
export function SegControl({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: ReactNode }[];
  value: string;
  onChange?: (id: string) => void;
}) {
  return (
    <div className="inline-flex h-[34px] overflow-hidden rounded-full border border-white/[0.18]">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange?.(o.id)}
          className={cn(
            "px-3.5 text-[12px] font-semibold transition-colors",
            o.id === value ? "bg-white text-suite-ink" : "bg-transparent text-[#aeb8cc] hover:text-white",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Hero round/selection pill (`.selpill`). */
export function SelPill({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-[34px] items-center gap-2 rounded-full border border-white/[0.14] bg-white/10 px-[13px] text-[12.5px] font-medium text-[#dfe6f2]"
    >
      {children}
    </button>
  );
}

/** Hero ghost / go button (`.btnw` / `.go`). */
export function HeroGhostBtn({
  children,
  go,
  href,
  onClick,
}: {
  children: ReactNode;
  go?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  const cls = cn(
    "inline-flex h-[34px] items-center gap-[7px] rounded-full px-[15px] text-[12.5px] font-semibold",
    go ? "border border-white bg-white text-suite-ink" : "border border-white/[0.18] bg-transparent text-[#dfe6f2] hover:border-white/40",
  );
  if (href)
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

/** Clarification source tag (`.src`). */
export function SourceTag({ children }: { children: ReactNode }) {
  return (
    <span className="justify-self-start whitespace-nowrap rounded-full bg-suite-neut-bg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-suite-neut">
      {children}
    </span>
  );
}

/** Include-in-PTC checkbox (`.ptc .box`). */
export function PtcCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange?: (v: boolean) => void;
  label?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange?.(!checked)}
      className="flex items-center gap-[7px] text-[11px] text-suite-ink-3"
    >
      <span
        className={cn(
          "grid size-[15px] place-items-center rounded-[5px] border-[1.5px] text-[9px] text-suite-blue",
          checked ? "border-[#cddef] bg-suite-blue-soft" : "border-suite-line-2",
        )}
      >
        {checked ? "✓" : ""}
      </span>
      {label}
    </button>
  );
}

/* ════════════════════════ ORGANISMS (parent sections) ════════════════════════ */

/** Numbered section header with blue underline (`.sectitle`). */
export function SectionTitle({
  no,
  title,
  right,
}: {
  no?: ReactNode;
  title: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3.5 mt-6 flex flex-wrap items-baseline gap-3 border-b-2 border-suite-blue pb-2">
      {no != null && <span className="suite-num text-[14px] font-semibold text-suite-blue">{no}</span>}
      <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-suite-ink">{title}</h2>
      {right && <span className="ml-auto">{right}</span>}
    </div>
  );
}

/** Uppercase sub-title with optional count + right slot (`.subt`). */
export function SubTitle({
  children,
  count,
  right,
}: {
  children: ReactNode;
  count?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-2 mt-4 flex flex-wrap items-center gap-2 px-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-suite-ink-3">
      {children}
      {count && <span className="font-medium normal-case tracking-normal text-suite-ink-4">{count}</span>}
      {right && <span className="ml-auto">{right}</span>}
    </div>
  );
}

/** Headline summary cards row (`.heads`) — 1→2→4 by container width. */
export function HeadlineCards({ cards }: { cards: HCardProps[] }) {
  return (
    <div className="@container mb-4">
      <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2 @2xl:grid-cols-4">
        {cards.map((c, i) => (
          <HCard key={i} {...c} />
        ))}
      </div>
    </div>
  );
}

/** Report meta band (`.meta`) — wraps; dividers hidden once wrapped. */
export function MetaBand({ items }: { items: { k: ReactNode; v: ReactNode }[] }) {
  return (
    <div className="@container mb-3.5 flex flex-wrap items-center gap-4 rounded-[14px] border border-suite-line bg-suite-card-soft px-[18px] py-3.5">
      {items.map((m, i) => (
        <div key={i} className="flex items-center gap-4">
          {i > 0 && <span className="hidden h-7 w-px bg-suite-line @md:block" />}
          <div>
            <div className="text-[9.5px] uppercase tracking-[0.07em] text-suite-ink-4">{m.k}</div>
            <div className="mt-0.5 text-[13px] font-semibold text-suite-ink">{m.v}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Section nav pill links (`.nav`). */
export function SectionNav({
  links,
}: {
  links: { no?: ReactNode; label: ReactNode; href: string }[];
}) {
  return (
    <div className="mb-[18px] flex flex-wrap gap-[7px]">
      {links.map((l, i) => (
        <a
          key={i}
          href={l.href}
          className="rounded-full border border-suite-line-2 px-[13px] py-1.5 text-[11.5px] font-medium text-suite-ink-2 hover:border-suite-blue hover:text-suite-blue"
        >
          {l.no != null && <span className="suite-num mr-1.5 text-suite-ink-4">{l.no}</span>}
          {l.label}
        </a>
      ))}
    </div>
  );
}

/** Award recommendation box (`.recbox`). */
export function RecBox({
  title,
  body,
  sign,
}: {
  title: ReactNode;
  body?: ReactNode;
  sign?: ReactNode;
}) {
  return (
    <div className="my-2 rounded-[14px] border-[1.5px] border-suite-green bg-suite-green-soft px-5 py-[18px]">
      <div className="mb-2.5 flex flex-wrap items-center gap-2.5 text-[15px] font-bold text-suite-good">
        {title}
      </div>
      {body && <div className="text-[12.5px] leading-[1.6] text-suite-ink-2">{body}</div>}
      {sign && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-suite-ink-3">{sign}</div>
      )}
    </div>
  );
}

/** Narrative paragraph (`p.prose`). */
export function Prose({
  children,
  size = 13,
  muted,
}: {
  children: ReactNode;
  size?: number;
  muted?: boolean;
}) {
  return (
    <p
      className={cn("mb-3 max-w-[78ch] leading-[1.65]", muted ? "text-suite-ink-3" : "text-suite-ink-2")}
      style={{ fontSize: size }}
    >
      {children}
    </p>
  );
}

/** QS comment row (`.qsrow`). */
export function QsCommentRow({
  code,
  name,
  children,
}: {
  code: ReactNode;
  name: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-suite-line-soft py-3 last:border-b-0">
      <div className="mb-1.5 flex items-center gap-2.5">
        <CodeBadge>{code}</CodeBadge>
        <span className="font-semibold text-suite-ink">{name}</span>
      </div>
      <p className="m-0 max-w-[78ch] text-[13px] leading-[1.65] text-suite-ink-2">{children}</p>
    </div>
  );
}

/** PTC rounds timeline (`.ptctl`) — 1→2→4 by container width. */
export function PtcTimeline({ rounds }: { rounds: React.ComponentProps<typeof PtcRoundCard>[] }) {
  return (
    <div className="@container mb-3.5">
      <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2 @2xl:grid-cols-4">
        {rounds.map((r, i) => (
          <PtcRoundCard key={i} {...r} />
        ))}
      </div>
    </div>
  );
}

/** Clarification row (`.clar`) — stacks below @lg, 4-col grid at @lg. */
export function ClarRow({
  source,
  question,
  questionRef,
  answer,
  status,
}: {
  source: ReactNode;
  question: ReactNode;
  questionRef?: ReactNode;
  answer: ReactNode;
  status?: ReactNode;
}) {
  return (
    <div className="@container border-b border-suite-line-soft last:border-b-0">
      <div className="grid grid-cols-1 items-start gap-3.5 p-3 @lg:grid-cols-[110px_1fr_1fr_120px]">
        <SourceTag>{source}</SourceTag>
        <div className="text-[11.5px] text-suite-ink">
          {question}
          {questionRef && (
            <span className="suite-num mt-[3px] block text-[10px] text-suite-ink-4">{questionRef}</span>
          )}
        </div>
        <div className="text-[11.5px] text-suite-ink-2">{answer}</div>
        {status && <div className="@lg:justify-self-end">{status}</div>}
      </div>
    </div>
  );
}

/** Report deviation row variant B (`.dev` 4-col: category·stmt·status·resolved). */
export function ReportDeviationRow({
  category,
  statement,
  statementRef,
  status,
  resolved,
}: {
  category: ReactNode;
  statement: ReactNode;
  statementRef?: ReactNode;
  status?: ReactNode;
  resolved?: ReactNode;
}) {
  return (
    <div className="@container border-b border-suite-line-soft last:border-b-0">
      <div className="grid grid-cols-1 items-center gap-3.5 px-3 py-2.5 @lg:grid-cols-[110px_1fr_90px_90px]">
        <span className="justify-self-start whitespace-nowrap rounded-full bg-suite-neut-bg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-suite-neut">
          {category}
        </span>
        <div className="text-[12px] text-suite-ink">
          {statement}
          {statementRef && (
            <span className="suite-num mt-0.5 block text-[10px] text-suite-ink-4">{statementRef}</span>
          )}
        </div>
        <div>{status}</div>
        <div>{resolved}</div>
      </div>
    </div>
  );
}

/** Conclusions gate (`.gate`) — 2→3→5 by container width. */
export function ConclusionsGate({ boxes }: { boxes: { k: ReactNode; v: ReactNode }[] }) {
  return (
    <div className="@container">
      <div className="grid grid-cols-2 gap-3 @lg:grid-cols-3 @3xl:grid-cols-5">
        {boxes.map((b, i) => (
          <GBox key={i} k={b.k}>
            {b.v}
          </GBox>
        ))}
      </div>
    </div>
  );
}

/** Legend strip (`.legend`). */
export function Legend({ children }: { children: ReactNode }) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-[18px] gap-y-2.5 px-1 text-[11.5px] text-suite-ink-3">
      {children}
    </div>
  );
}
