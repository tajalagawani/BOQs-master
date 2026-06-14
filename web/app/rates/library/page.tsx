// RatesX → Library (the searchable catalogue of every uploaded rate).
// This was previously at /rates; the home screen now lives there and this
// route holds the table workspace.

import { RatesLibrarySuiteWorkspace } from "@/components/rates-library/RatesLibrarySuiteWorkspace";
import { loadInitialRates } from "@/modules/rates/server/loadInitialRates";

export const dynamic = "force-dynamic";

export default async function RatesLibraryPage() {
  const { rates, filters, persisted } = await loadInitialRates();

  return (
    <main className="flex-1 min-h-0 overflow-hidden">
      <RatesLibrarySuiteWorkspace
        seedRows={rates}
        seedFilters={filters}
        persisted={persisted}
      />
    </main>
  );
}
