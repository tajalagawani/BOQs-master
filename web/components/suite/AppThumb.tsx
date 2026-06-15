/**
 * 10X Suite — launcher card mini-previews.
 * Faithful ports of the `.mini` thumbnails in 10x-suite-launcher.html
 * (ioProcure rows + tender card, ParametriX massing, ControlX dashboard,
 * IntelleX map), generalised into reusable variants keyed by SuitePreview.
 *
 * Purely decorative chrome with a few real values threaded through `data`.
 */
import { Lock } from "lucide-react";
import type { SuiteApp, SuitePreview } from "./types";

type ThumbData = NonNullable<SuiteApp["previewData"]>;

export function AppThumb({
  preview,
  data = {},
}: {
  preview: SuitePreview;
  data?: ThumbData;
}) {
  switch (preview) {
    case "tenders":
      return <TendersThumb data={data} />;
    case "boqs":
      return <BoqsThumb />;
    case "cost":
      return <CostThumb data={data} />;
    case "rates":
      return <RatesThumb />;
    case "projects":
      return <ProjectsThumb data={data} />;
    case "soon":
    default:
      return <SoonThumb />;
  }
}

/* ── ioProcure — tender review + bidder card ─────────────────────────────── */
function TendersThumb({ data }: { data: ThumbData }) {
  return (
    <div className="absolute inset-0">
      <div className="absolute left-4 top-3.5 flex gap-2 text-[8px] text-suite-ink-3">
        <span className="border-b-2 border-suite-blue pb-[3px] font-semibold text-suite-blue">
          Tender Review
        </span>
        <span>Compare</span>
        <span>Report</span>
      </div>
      <div className="absolute left-4 top-[42px] flex w-[120px] flex-col gap-[7px]">
        <i className="block h-[7px] rounded-[3px] bg-[#dfe2ea]" />
        <i className="block h-[7px] w-4/5 rounded-[3px] bg-[#dfe2ea]" />
        <i className="block h-[7px] w-3/5 rounded-[3px] bg-[#dfe2ea]" />
      </div>
      <div className="absolute bottom-4 right-3.5 w-[150px] rounded-[10px] bg-gradient-to-br from-suite-blue to-[#5b86e0] px-3 py-[11px] text-white shadow-[0_8px_20px_rgba(59,111,214,0.35)]">
        <div className="mb-[7px] text-[8px] opacity-85">
          {data.title ?? "Portfolio"}
        </div>
        <div className="flex gap-3">
          <div>
            <b className="suite-num block text-[14px] font-semibold">
              {data.primary ?? "—"}
            </b>
            <span className="text-[7px] opacity-80">
              {data.primaryLabel ?? "Tenders"}
            </span>
          </div>
          <div>
            <b className="suite-num block text-[14px] font-semibold">
              {data.secondary ?? "—"}
            </b>
            <span className="text-[7px] opacity-80">
              {data.secondaryLabel ?? "Pending"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── ioTranslate — priced spreadsheet ─────────────────────────────────────────── */
function BoqsThumb() {
  return (
    <div className="absolute inset-0">
      {/* grid */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(#e7eaef 1px,transparent 1px),linear-gradient(90deg,#e7eaef 1px,transparent 1px)",
          backgroundSize: "100% 20px, 30px 100%",
        }}
      />
      <div className="absolute left-4 right-4 top-3.5">
        <div className="flex gap-1.5 text-[8px] font-semibold text-suite-ink-3">
          <span className="flex-1">Item</span>
          <span className="w-10 text-right">Qty</span>
          <span className="w-12 text-right">Rate</span>
          <span className="w-14 text-right">Amount</span>
        </div>
        <div className="mt-2 flex flex-col gap-[9px]">
          {[
            ["68%", "62%", "8,400"],
            ["54%", "70%", "12,250"],
            ["72%", "48%", "5,120"],
          ].map(([w, , amt], i) => (
            <div key={i} className="flex items-center gap-1.5">
              <i
                className="block h-[6px] rounded-[3px] bg-[#dbe0ea]"
                style={{ width: w }}
              />
              <span className="ml-auto suite-num text-[8px] font-semibold text-suite-ink-2">
                {amt}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-4 right-3.5 rounded-[10px] bg-gradient-to-br from-suite-olive to-[#9c8f2f] px-3 py-2.5 text-white shadow-[0_8px_20px_rgba(185,169,63,0.32)]">
        <div className="text-[7px] opacity-85">Bill total</div>
        <b className="suite-num text-[13px] font-semibold">AED 4.27M</b>
      </div>
    </div>
  );
}

/* ── ioMaster — parametric massing ─────────────────────────────────────────── */
function CostThumb({ data }: { data: ThumbData }) {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(#e7eaef 1px,transparent 1px),linear-gradient(90deg,#e7eaef 1px,transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div
        className="absolute h-[34px] w-[38px] bg-gradient-to-br from-[#dde2ea] to-[#c2cad8]"
        style={{ left: 96, top: 104, transform: "skewY(-12deg)" }}
      />
      <div
        className="absolute h-[70px] w-[46px] bg-gradient-to-br from-[#cfd6e2] to-[#aab4c6]"
        style={{ left: 120, top: 70, transform: "skewY(-12deg)" }}
      />
      <div
        className="absolute h-[48px] w-[40px] bg-gradient-to-br from-[#b8c1d2] to-[#97a3ba]"
        style={{ left: 166, top: 92, transform: "skewY(-12deg)" }}
      />
      <div className="suite-num absolute right-4 top-3.5 text-[9px] text-[#6b7488]">
        Overall cost
        <br />
        <b className="text-suite-ink">{data.cost ?? "AED —"}</b>
      </div>
    </div>
  );
}

/* ── ioInsight — benchmark dashboard ───────────────────────────────────────── */
function RatesThumb() {
  return (
    <div className="absolute inset-0">
      <div className="absolute left-4 right-4 top-4 flex gap-2">
        <div className="grid h-[42px] flex-1 place-items-center rounded-lg bg-[#3f8f7f] text-white">
          <b className="suite-num text-[15px]">128</b>
        </div>
        <div className="grid h-[42px] flex-1 place-items-center rounded-lg bg-[#2f6d62] text-white">
          <b className="suite-num text-[15px]">42</b>
        </div>
      </div>
      <div className="absolute bottom-3.5 left-4 right-4 flex h-16 items-end gap-[5px]">
        {[30, 55, 40, 70, 50, 85, 62, 45].map((h, i) => (
          <i
            key={i}
            className={`flex-1 rounded-t-[2px] ${i % 2 ? "bg-[#cdd9d4]" : "bg-[#9fc2b6]"}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Projects — masterplan map ──────────────────────────────────────────── */
function ProjectsThumb({ data }: { data: ThumbData }) {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-gradient-to-br from-[#eef1f4] to-[#e3e7ec]" />
      <span className="absolute left-4 top-3.5 max-w-[150px] truncate whitespace-nowrap rounded-md border border-suite-line bg-white px-[7px] py-[3px] text-[8px] font-medium text-suite-ink-2">
        {data.meta ?? "Portfolio"}
      </span>
      <div
        className="absolute h-16 w-[88px] rounded-[4px] border-2 border-suite-green bg-suite-green/15"
        style={{ left: "50%", top: "46%", transform: "translate(-50%,-50%) rotate(-8deg)" }}
      />
      <span className="absolute left-[62%] top-[38%] size-3 rounded-full border-2 border-white bg-suite-green shadow-[0_2px_6px_rgba(0,0,0,0.2)]" />
      <div className="absolute bottom-3.5 left-4 right-4 text-[9px] text-suite-ink-2">
        <span className="block truncate font-semibold text-suite-ink">
          {data.location ?? "—"}
        </span>
      </div>
    </div>
  );
}

/* ── Coming soon ────────────────────────────────────────────────────────── */
function SoonThumb() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="flex flex-col items-center gap-2 text-suite-ink-4">
        <span className="grid size-9 place-items-center rounded-full bg-white/70 shadow-sm">
          <Lock className="size-4" strokeWidth={1.75} />
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wide">
          Coming soon
        </span>
      </div>
    </div>
  );
}
