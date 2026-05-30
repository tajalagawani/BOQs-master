"use client";

import Accordion from "@/components/Accordion";
import DataTable from "@/components/ui/DataTable";
import { infrastructureConfig } from "@/config/tableConfigs";
import type { InfrastructureConfig } from "@/types/masterplan";

interface Props {
  config: InfrastructureConfig;
  onUpdateConfig?: (key: string, value: unknown) => void;
}

export default function Infrastructure({ config, onUpdateConfig }: Props) {
  // Convert the single config object to an array of one row for DataTable
  const data = [
    { id: "infrastructure-1", ...config } as Record<string, unknown> & {
      id: string;
    },
  ];

  return (
    <Accordion title="Infrastructure" totalCost={config.totalInfrastructureCost}>
      <div className="mt-4">
        <DataTable
          config={infrastructureConfig}
          data={data}
          onUpdate={
            onUpdateConfig
              ? (_id, key, value) => onUpdateConfig(key, value)
              : undefined
          }
        />
      </div>
    </Accordion>
  );
}
