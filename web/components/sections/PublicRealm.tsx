"use client";

import { Plus, AlertTriangle } from "lucide-react";
import Accordion from "@/components/Accordion";
import DataTable from "@/components/ui/DataTable";
import { publicRealmConfig } from "@/config/tableConfigs";
import { getPublicRealmOptions } from "@/utils/dropdownOptions";
import { formatNumber } from "@/utils/formatters";
import { cn } from "@/lib/cn";
import type { PublicRealmAsset } from "@/types/masterplan";
import type { CostModelEntry } from "@/types/costModel";

interface MasterplanPhase {
  phaseNumber: number;
  phaseName: string;
  startDate: string;
  totalMonths: number;
}

interface Props {
  assets: PublicRealmAsset[];
  totalCost: number;
  costModelEntries: CostModelEntry[];
  phases?: MasterplanPhase[];
  onAddAsset?: () => void;
  onDeleteAsset?: (id: string) => void;
  onUpdateAsset?: (id: string, key: string, value: unknown) => void;
  grossLandArea?: number;
  totalBuildingPlotArea?: number;
  totalPublicRealmArea?: number;
  balanceExternalArea?: number;
  isBalanceAreaValid?: boolean;
}

export default function PublicRealm({
  assets,
  totalCost,
  costModelEntries,
  phases,
  onAddAsset,
  onDeleteAsset,
  onUpdateAsset,
  grossLandArea = 0,
  totalBuildingPlotArea = 0,
  totalPublicRealmArea = 0,
  balanceExternalArea = 0,
  isBalanceAreaValid = true,
}: Props) {
  const dropdownOptions = getPublicRealmOptions(costModelEntries, phases);
  const filledCount = assets.filter((a) => a.assetTypologyL2).length;

  return (
    <Accordion
      title="Public Realm"
      count={filledCount}
      totalCost={totalCost}
      actionButton={
        <button
          type="button"
          onClick={onAddAsset}
          className="h-8 px-3 inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-full"
        >
          <Plus className="size-3.5" strokeWidth={2.25} />
          Add New Public Realm
        </button>
      }
    >
      <div className="mt-4">
        {/* Balance External Area Summary */}
        <div
          className={cn(
            "rounded-xl p-4 mb-4 border",
            isBalanceAreaValid
              ? "bg-emerald-50 border-emerald-200"
              : "bg-rose-50 border-rose-200",
          )}
        >
          <h4
            className={cn(
              "text-sm font-semibold mb-3",
              isBalanceAreaValid ? "text-emerald-900" : "text-rose-900",
            )}
          >
            Balance External Area Calculation
          </h4>

          <div className="grid grid-cols-4 gap-4 text-xs">
            <div>
              <p className="text-zinc-500">Gross Land Area</p>
              <p className="font-medium text-zinc-900 mt-0.5">
                {formatNumber(grossLandArea)} m²
              </p>
            </div>
            <div>
              <p className="text-zinc-500">Building Plot Areas</p>
              <p className="font-medium text-zinc-900 mt-0.5">
                − {formatNumber(totalBuildingPlotArea)} m²
              </p>
            </div>
            <div>
              <p className="text-zinc-500">Public Realm Areas</p>
              <p className="font-medium text-zinc-900 mt-0.5">
                − {formatNumber(totalPublicRealmArea)} m²
              </p>
            </div>
            <div>
              <p className="text-zinc-500">Balance External Area</p>
              <p
                className={cn(
                  "font-semibold mt-0.5",
                  isBalanceAreaValid ? "text-emerald-700" : "text-rose-700",
                )}
              >
                = {formatNumber(balanceExternalArea)} m²
              </p>
            </div>
          </div>

          {!isBalanceAreaValid && (
            <div className="mt-3 flex items-start gap-2 text-rose-700">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" strokeWidth={2} />
              <p className="text-xs">
                <strong>Error:</strong> Total allocated areas exceed Gross Land
                Area by {formatNumber(Math.abs(balanceExternalArea))} m². Reduce
                Building Assets plot areas or Public Realm areas.
              </p>
            </div>
          )}

          {isBalanceAreaValid && balanceExternalArea > 0 && (
            <p className="mt-2 text-[11px] text-emerald-700">
              Remaining area available for roads, utilities, and other infrastructure.
            </p>
          )}
        </div>

        {/* Typologies info */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 mb-4">
          <p className="text-[11px] text-zinc-600">
            <strong>Available Typologies:</strong> District Park,
            Neighborhood Park, Local Park, Pocket Park, Buffer Landscapes and Trails
          </p>
        </div>

        <DataTable
          config={publicRealmConfig}
          data={assets as unknown as Array<Record<string, unknown> & { id: string }>}
          onDelete={onDeleteAsset}
          onUpdate={onUpdateAsset}
          dropdownOptions={dropdownOptions}
        />
      </div>
    </Accordion>
  );
}
