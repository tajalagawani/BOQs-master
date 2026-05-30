"use client";

import { Plus } from "lucide-react";
import Accordion from "@/components/Accordion";
import DataTable from "@/components/ui/DataTable";
import { additionalAssetConfig } from "@/config/tableConfigs";
import { getAdditionalAssetOptions } from "@/utils/dropdownOptions";
import type { AdditionalAsset as AdditionalAssetType } from "@/types/masterplan";
import type { CostModelEntry } from "@/types/costModel";

interface MasterplanPhase {
  phaseNumber: number;
  phaseName: string;
  startDate: string;
  totalMonths: number;
}

interface Props {
  assets: AdditionalAssetType[];
  totalCost: number;
  costModelEntries: CostModelEntry[];
  phases?: MasterplanPhase[];
  onAddAsset?: () => void;
  onDeleteAsset?: (id: string) => void;
  onUpdateAsset?: (id: string, key: string, value: unknown) => void;
}

export default function AdditionalAsset({
  assets,
  totalCost,
  costModelEntries,
  phases,
  onAddAsset,
  onDeleteAsset,
  onUpdateAsset,
}: Props) {
  const dropdownOptions = getAdditionalAssetOptions(costModelEntries, phases);
  const filledCount = assets.filter((a) => a.assetTypologyL2).length;

  return (
    <Accordion
      title="Additional Asset"
      count={filledCount}
      totalCost={totalCost}
      actionButton={
        <button
          type="button"
          onClick={onAddAsset}
          className="h-8 px-3 inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-full"
        >
          <Plus className="size-3.5" strokeWidth={2.25} />
          Add Additional Asset
        </button>
      }
    >
      <div className="mt-4">
        <DataTable
          config={additionalAssetConfig}
          data={assets as unknown as Array<Record<string, unknown> & { id: string }>}
          onDelete={onDeleteAsset}
          onUpdate={onUpdateAsset}
          dropdownOptions={dropdownOptions}
        />
      </div>
    </Accordion>
  );
}
