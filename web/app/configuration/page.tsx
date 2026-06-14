export const dynamic = "force-dynamic";

import {
  getCostModelEntries,
  getAllConfigurations,
  getParametricMatrix,
  getCostFactors,
} from "@/lib/queries/configuration";
import { convertDecimalToNumber } from "@/utils/decimal";
import ConfigurationClient from "@/components/configuration/ConfigurationClient";

export default async function ConfigurationPage() {
  const [costModelEntriesRaw, configurations, parametricMatrixRaw, costFactorsRaw] =
    await Promise.all([
      getCostModelEntries(),
      getAllConfigurations(),
      getParametricMatrix(),
      getCostFactors(),
    ]);

  const costModelEntries = convertDecimalToNumber(costModelEntriesRaw) as unknown as Parameters<
    typeof ConfigurationClient
  >[0]["costModelEntries"];
  const parametricMatrixEntries = convertDecimalToNumber(
    parametricMatrixRaw,
  ) as unknown as Parameters<typeof ConfigurationClient>[0]["parametricMatrixEntries"];
  const costFactors = convertDecimalToNumber(costFactorsRaw) as unknown as Parameters<
    typeof ConfigurationClient
  >[0]["costFactors"];

  return (
    <main className="flex-1 min-h-0 overflow-hidden">
      <ConfigurationClient
        costModelEntries={costModelEntries}
        configurations={configurations}
        parametricMatrixEntries={parametricMatrixEntries}
        costFactors={costFactors}
      />
    </main>
  );
}
