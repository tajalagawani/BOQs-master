// RatesX (Omnium) — faithful port of /Users/taj/rates rendered inside the
// IOX shell. The Omnium sidebar is preserved as the in-module section
// switcher (Buildings / Infrastructure / Industrial / …) — IOX's main
// home page has no sidebar, so there's no clash.

import { Header } from "@/components/Header";
import { RatesWorkspace } from "@/modules/rates/RatesWorkspace";
import { loadInitialRates } from "@/modules/rates/server/loadInitialRates";

export const dynamic = "force-dynamic";

export default async function RatesPage() {
  const { rates, filters, persisted } = await loadInitialRates();

  return (
    <>
      <Header />
      <main className="flex-1 min-h-0 overflow-hidden">
        <RatesWorkspace
          seedRows={rates}
          seedFilters={filters}
          persisted={persisted}
        />
      </main>
    </>
  );
}
