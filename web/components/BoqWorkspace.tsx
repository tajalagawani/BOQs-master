"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BoqActionBar } from "@/components/BoqActionBar";
import { BoqSections, type BoqSectionEntry } from "@/components/BoqSections";
import { BoqItemsTable, type BoqTableItem } from "@/components/BoqItemsTable";
import { BoqItemDetails, type BoqDetailItem } from "@/components/BoqItemDetails";

export interface WorkspaceData {
  sections: BoqSectionEntry[];
  itemsBySection: Record<string, BoqDetailItem[]>;
  totals: {
    amount: number;
    items: number;
    sections: number;
    trades: number;
    currentVersion: string;
  };
}

interface Props {
  projectName: string;
  data: WorkspaceData;
}

export function BoqWorkspace({ projectName, data }: Props) {
  const { sections, itemsBySection, totals } = data;
  const [sectionCode, setSectionCode] = useState<string>(
    sections[0]?.code ?? "",
  );
  const sectionItems: BoqDetailItem[] = useMemo(
    () => itemsBySection[sectionCode] ?? [],
    [sectionCode, itemsBySection],
  );
  const [itemCode, setItemCode] = useState<string | null>(
    sectionItems[0]?.code ?? null,
  );

  // When section changes, jump to its first item
  const onSelectSection = (code: string) => {
    setSectionCode(code);
    setItemCode(itemsBySection[code]?.[0]?.code ?? null);
  };

  const selectedItem =
    sectionItems.find((i) => i.code === itemCode) ?? null;
  const currentSection = sections.find((s) => s.code === sectionCode);

  const tableItems: BoqTableItem[] = sectionItems.map((it) => ({
    code: it.code,
    description: it.description,
    unit: it.unit,
    quantity: it.quantity,
    rate: it.rate,
    amount: it.amount,
    version: it.version,
    stage: it.stage,
  }));

  return (
    <div className="h-full w-full px-5 py-4 flex flex-col gap-4">
      <Link
        href="/boqs"
        className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 self-start"
      >
        <ArrowLeft className="size-3.5" strokeWidth={1.75} />
        BOQs / {projectName}
      </Link>

      <BoqActionBar />

      <div className="flex-1 min-h-0 flex gap-4">
        <BoqSections
          sections={sections}
          totals={totals}
          selectedSection={sectionCode}
          onSelect={onSelectSection}
        />
        <BoqItemsTable
          sectionCode={sectionCode}
          sectionName={currentSection?.name ?? ""}
          sectionItemCount={currentSection?.itemCount ?? 0}
          items={tableItems}
          selectedItemCode={itemCode}
          onSelectItem={setItemCode}
        />
        {selectedItem && (
          <BoqItemDetails
            item={selectedItem}
            onClose={() => setItemCode(null)}
          />
        )}
      </div>
    </div>
  );
}
