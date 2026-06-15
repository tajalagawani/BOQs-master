// ioInsight → Elemental by Project.
// Per-project NRM L1 elemental cost (per m² BUA/GIA/GFA), as a stacked
// composition or a per-element distribution. Currency is a hard axis: one
// currency is plotted at a time; the rest are surfaced as an excluded count.
//
// The full benchmark set (~180 projects) is fetched once and filtered entirely
// client-side, so every filter option can show a live count (and disable the
// empties). The whole body below the IOX header is owned by <ElementalWorkspace>.

import { fetchElementalByProject } from "@/modules/rates/lib/db/queries";
import {
  ElementalWorkspace,
  type ElementalParams,
} from "@/components/rates-home/ElementalWorkspace";
import type { Basis, ElementalView } from "@/modules/rates/charts/elemental-data";

export const dynamic = "force-dynamic";

interface SearchParams {
  basis?: Basis;
  currency?: string;
  assetClass?: string;
  assetType?: string;
  country?: string;
  refYear?: string;
  inflate?: "on" | "off";
  view?: ElementalView;
  normalize?: "on" | "off";
}

export default async function ElementalByProjectPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  // Fetch the full benchmark set once; the workspace filters client-side.
  const projects = await fetchElementalByProject();

  // Default currency: requested → AED → most common → "AED".
  const counts = new Map<string, number>();
  for (const p of projects) if (p.currency) counts.set(p.currency, (counts.get(p.currency) ?? 0) + 1);
  const available = new Set(counts.keys());
  const mostCommon = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const currency =
    sp.currency && available.has(sp.currency)
      ? sp.currency
      : available.has("AED")
        ? "AED"
        : (mostCommon ?? "AED");

  const params: ElementalParams = {
    basis: sp.basis ?? "GIA",
    currency,
    assetClass: sp.assetClass ?? "All",
    assetType: sp.assetType ?? "All",
    country: sp.country ?? "All",
    refYear: sp.refYear ? Number(sp.refYear) : new Date().getUTCFullYear(),
    inflate: (sp.inflate ?? "on") === "on",
    view: sp.view ?? "composition",
    normalize: (sp.normalize ?? "off") === "on",
  };

  return (
    <main className="flex-1 min-h-0 overflow-hidden">
      <ElementalWorkspace projects={projects} params={params} />
    </main>
  );
}
