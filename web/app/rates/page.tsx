// RatesX — home screen. Same IOX shell as /, /projects, /boqs, /costx,
// /procurex. The legacy table view lives at /rates/library.

import { Header } from "@/components/Header";
import { RatesHomeWorkspace } from "@/components/rates-home/RatesHomeWorkspace";
import { fetchHomeMetrics } from "@/modules/rates/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function RatesHomePage() {
  const metrics = await fetchHomeMetrics();

  return (
    <>
      {/* Same fixed bg as the other module home pages. */}
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 bg-no-repeat pointer-events-none"
        style={{
          backgroundImage: "url(/iox-bg.png)",
          backgroundSize: "cover",
          backgroundPosition: "center center",
        }}
      />

      <Header />

      <main className="flex-1 min-h-0 overflow-hidden">
        <RatesHomeWorkspace metrics={metrics} />
      </main>
    </>
  );
}
