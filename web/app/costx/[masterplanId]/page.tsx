// /costx/[id] — masterplan editor route. Mirrors
// roshn/src/app/masterplan-estimates/[id]/page.tsx.

export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { getMasterplanWithCosts } from "@/lib/queries/masterplans";
import {
  getCostModelEntries,
  getAllConfigurations,
} from "@/lib/queries/configuration";
import { loadMasterplanVersion } from "@/actions/masterplan";
import { convertDecimalToNumber } from "@/utils/decimal";
import MasterplanDetailClient from "@/components/masterplan/MasterplanDetailClient";

export default async function MasterplanDetailPage({
  params,
}: {
  params: Promise<{ masterplanId: string }>;
}) {
  const { masterplanId } = await params;

  const masterplanRaw = await getMasterplanWithCosts(masterplanId);
  if (!masterplanRaw) notFound();

  const [costModelEntries, configurations, savedVersion] = await Promise.all([
    getCostModelEntries(),
    getAllConfigurations(),
    loadMasterplanVersion(masterplanId, "v1"),
  ]);

  // Convert Prisma Decimals to plain numbers so the client can render
  const masterplan = convertDecimalToNumber(masterplanRaw) as unknown as Parameters<
    typeof MasterplanDetailClient
  >[0]["masterplan"];
  const costModelEntriesConverted = convertDecimalToNumber(
    costModelEntries,
  ) as unknown as Parameters<typeof MasterplanDetailClient>[0]["costModelEntries"];

  return (
    <>
      <Header />
      <main className="flex-1 min-h-0 overflow-hidden">
        <MasterplanDetailClient
          masterplan={masterplan}
          costModelEntries={costModelEntriesConverted}
          savedVersion={savedVersion}
          configurations={configurations}
        />
      </main>
    </>
  );
}
