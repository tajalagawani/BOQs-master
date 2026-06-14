// RatesX — home screen. Same IOX shell as /, /projects, /boqs, /costx,
// /procurex. The legacy table view lives at /rates/library.

import { RatesSuiteWorkspace } from "@/components/rates-home/RatesSuiteWorkspace";
import { fetchHomeMetrics } from "@/modules/rates/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function RatesHomePage() {
  const metrics = await fetchHomeMetrics();

  return (
    <main className="flex-1 min-h-0 overflow-y-auto">
      <RatesSuiteWorkspace metrics={metrics} />
    </main>
  );
}
