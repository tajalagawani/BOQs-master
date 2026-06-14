"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GitBranch } from "lucide-react";
import {
  SuiteInnerShell,
  SuiteInnerHeader,
  SuiteButton,
} from "@/components/suite";
import ConfigTabs from "@/components/configuration/ConfigTabs";
import AssetHierarchyTree from "@/components/configuration/AssetHierarchyTree";
import CostModellingPanel from "@/components/configuration/CostModellingPanel";
import ParametricTree from "@/components/configuration/ParametricTree";
import ParametricMatrixPanel from "@/components/configuration/ParametricMatrixPanel";
import CostFactorPanel from "@/components/configuration/CostFactorPanel";
import DensityRangeFactorPanel from "@/components/configuration/DensityRangeFactorPanel";
import InfrastructureSplitPanel from "@/components/configuration/InfrastructureSplitPanel";
import ParkingSpacePanel from "@/components/configuration/ParkingSpacePanel";
import SCurveSettingsPanel, { SCurveSettings } from "@/components/configuration/SCurveSettingsPanel";
import DropdownOptionsPanel, { DropdownOptionsPanelRef } from "@/components/configuration/DropdownOptionsPanel";
import SystemDefaultsPanel, { SystemDefaultsSettings } from "@/components/configuration/SystemDefaultsPanel";
import { ConfigTab, ParametricTreeNode } from "@/types/costModel";
import { TreeNode } from "@/components/ui/TreeView";
import { parametricTree } from "@/constants";
import {
  addCostModelEntry,
  editCostModelEntry,
  deleteCostModelEntry,
} from "@/actions/costModel";
import { updateConfiguration } from "@/actions/configuration";
import { CostFactorSettings } from "@/components/configuration/CostFactorPanel";

interface ConfigurationClientProps {
  costModelEntries: any[];
  configurations?: Record<string, any>;
  parametricMatrixEntries?: any[];
  costFactors?: any[];
}

export default function ConfigurationClient({
  costModelEntries,
  configurations,
  parametricMatrixEntries = [],
  costFactors = [],
}: ConfigurationClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<ConfigTab>("cost-modelling");
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [selectedParametricNode, setSelectedParametricNode] = useState<ParametricTreeNode | null>(null);
  const dropdownOptionsRef = useRef<DropdownOptionsPanelRef>(null);
  const [costFactorSettings, setCostFactorSettings] = useState<CostFactorSettings | null>(null);
  const [scurveSettings, setScurveSettings] = useState<SCurveSettings | null>(null);
  const [systemDefaultsSettings, setSystemDefaultsSettings] = useState<SystemDefaultsSettings | null>(null);

  // Extract filters from selected node
  const getFiltersFromNode = (node: TreeNode | null) => {
    if (!node) return {};

    const filters: {
      assetClass?: string;
      assetTypeL1?: string;
      assetFormL2?: string;
      pricePoint?: string;
    } = {};

    // Parse node ID to extract filters
    const id = node.id;
    if (id.startsWith("class-")) {
      filters.assetClass = node.label;
    } else if (id.startsWith("type-")) {
      const parts = id.replace("type-", "").split("-");
      filters.assetClass = parts[0];
      filters.assetTypeL1 = node.label;
    } else if (id.startsWith("form-")) {
      const parts = id.replace("form-", "").split("-");
      filters.assetClass = parts[0];
      filters.assetTypeL1 = parts[1];
      filters.assetFormL2 = node.label;
    } else if (id.startsWith("price-")) {
      const parts = id.replace("price-", "").split("-");
      filters.assetClass = parts[0];
      filters.assetTypeL1 = parts[1];
      filters.assetFormL2 = parts[2];
      filters.pricePoint = node.label;
    }

    return filters;
  };

  const nodeFilters = getFiltersFromNode(selectedNode);

  const handleSave = async () => {
    // Handle dropdown-options save specially
    if (activeTab === "dropdown-options" && dropdownOptionsRef.current) {
      const success = await dropdownOptionsRef.current.save();
      if (success) {
        toast.success("Benchmarks Filter saved successfully!");
      } else {
        toast.error("Failed to save Benchmarks Filter. Please try again.");
      }
      return;
    }

    // Handle cost-factor save
    if (activeTab === "cost-factor" && costFactorSettings) {
      const result = await updateConfiguration("cost_factor_settings", costFactorSettings);
      if (result.success) {
        toast.success("Cost Factor settings saved successfully!");
      } else {
        toast.error("Failed to save Cost Factor settings. Please try again.");
      }
      return;
    }

    // Handle scurve-settings save
    if (activeTab === "scurve-settings" && scurveSettings) {
      const result = await updateConfiguration("scurve_settings", scurveSettings);
      if (result.success) {
        toast.success("S-Curve settings saved successfully!");
      } else {
        toast.error("Failed to save S-Curve settings. Please try again.");
      }
      return;
    }

    // Handle system-defaults save
    if (activeTab === "system-defaults" && systemDefaultsSettings) {
      const result = await updateConfiguration("system_defaults", systemDefaultsSettings);
      if (result.success) {
        toast.success("System Defaults saved successfully!");
      } else {
        toast.error("Failed to save System Defaults. Please try again.");
      }
      return;
    }

    // TODO: Implement save functionality for other tabs
    const messages: Record<ConfigTab, string> = {
      "cost-modelling": "Cost model saved!",
      "parametric-matrix": "Parametric Adjustment Matrix saved!",
      "cost-factor": "Cost Factor saved!",
      "density-range-factor": "Density Range Factor saved!",
      "infrastructure-split": "Infrastructure Split saved!",
      "parking-space": "Parking Space saved!",
      "scurve-settings": "S-Curve settings saved!",
      "dropdown-options": "Benchmarks Filter saved!",
      "system-defaults": "System Defaults saved!",
    };
    toast.success(messages[activeTab]);
  };

  const getSaveButtonText = () => {
    const labels: Record<ConfigTab, string> = {
      "cost-modelling": "Save Cost Model",
      "parametric-matrix": "Save Parametric Adjustment Matrix",
      "cost-factor": "Save Cost Factor",
      "density-range-factor": "Save Density Range Factor",
      "infrastructure-split": "Save Infrastructure Split",
      "parking-space": "Save Parking Space",
      "scurve-settings": "Save S-Curve",
      "dropdown-options": "Save Benchmarks Filter",
      "system-defaults": "Save System Defaults",
    };
    return labels[activeTab];
  };

  // Handlers for Asset Hierarchy CRUD operations
  const handleAddEntry = async (entry: {
    assetClass?: string;
    assetTypeL1?: string;
    assetFormL2?: string;
    pricePoint?: string;
    extraPath?: string;
  }) => {
    const result = await addCostModelEntry(entry);
    if (result.success) {
      router.refresh();
    } else {
      throw new Error(result.error);
    }
  };

  const handleEditEntry = async (
    oldValue: string,
    newValue: string,
    level: string,
    context: {
      assetClass?: string;
      assetTypeL1?: string;
      assetFormL2?: string;
      pricePoint?: string;
      extraPath?: string;
    }
  ) => {
    const result = await editCostModelEntry(oldValue, newValue, level, context);
    if (result.success) {
      router.refresh();
    } else {
      throw new Error(result.error);
    }
  };

  const handleDeleteEntry = async (entry: {
    assetClass?: string;
    assetTypeL1?: string;
    assetFormL2?: string;
    pricePoint?: string;
    extraPath?: string;
  }) => {
    const result = await deleteCostModelEntry(entry);
    if (result.success) {
      router.refresh();
    } else {
      throw new Error(result.error);
    }
  };

  return (
    <SuiteInnerShell
      crumb={<span className="font-semibold text-[#cdd6e6]">Configuration</span>}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search configuration…"
      header={
        <SuiteInnerHeader
          title="Configuration"
          subtitle="Manage your asset hierarchy and cost models"
          actions={
            <>
              <SuiteButton href="/asset-hierarchy">
                <GitBranch className="size-4" strokeWidth={2} />
                Flow View
              </SuiteButton>
              <SuiteButton onClick={handleSave} variant="dark">
                {getSaveButtonText()}
              </SuiteButton>
            </>
          }
        />
      }
    >
      <div className="flex h-full flex-col rounded-[10px] border border-suite-line bg-white">
        {/* Tabs */}
        <div className="shrink-0 border-b border-suite-line px-2">
          <ConfigTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-hidden p-4">
          {activeTab === "cost-modelling" && (
          <div className="flex gap-6 h-full">
            {/* Left Panel - Asset Hierarchy */}
            <div className="w-[350px] flex-shrink-0">
              <AssetHierarchyTree
                onNodeSelect={setSelectedNode}
                selectedNodeId={selectedNode?.id}
                costModelEntries={costModelEntries}
                onAddEntry={handleAddEntry}
                onEditEntry={handleEditEntry}
                onDeleteEntry={handleDeleteEntry}
              />
            </div>

            {/* Right Panel - Cost Modelling Table */}
            <div className="flex-1 min-w-0">
              <CostModellingPanel
                costModelEntries={costModelEntries}
                selectedAssetClass={nodeFilters.assetClass}
                selectedAssetTypeL1={nodeFilters.assetTypeL1}
                selectedAssetFormL2={nodeFilters.assetFormL2}
                selectedPricePoint={nodeFilters.pricePoint}
                onRefresh={() => router.refresh()}
              />
            </div>
          </div>
        )}

        {activeTab === "parametric-matrix" && (
          <div className="flex gap-6 h-full">
            {/* Left Panel - Parametric Tree */}
            <div className="w-[350px] flex-shrink-0">
              <ParametricTree
                tree={parametricTree}
                onNodeSelect={setSelectedParametricNode}
                selectedNodeId={selectedParametricNode?.id}
              />
            </div>

            {/* Right Panel - Parametric Matrix Table */}
            <div className="flex-1 min-w-0">
              <ParametricMatrixPanel
                parametricMatrixEntries={parametricMatrixEntries}
                selectedNode={selectedParametricNode}
              />
            </div>
          </div>
        )}

        {activeTab === "cost-factor" && (
          <div className="h-full">
            <CostFactorPanel
              costFactors={costFactors}
              initialSettings={configurations?.cost_factor_settings}
              onSettingsChange={setCostFactorSettings}
            />
          </div>
        )}

        {activeTab === "density-range-factor" && (
          <div className="h-full">
            <DensityRangeFactorPanel />
          </div>
        )}

        {activeTab === "infrastructure-split" && (
          <div className="h-full">
            <InfrastructureSplitPanel
              costModelEntries={costModelEntries}
              initialSplit={configurations?.infrastructure_split}
            />
          </div>
        )}

        {activeTab === "parking-space" && (
          <div className="h-full">
            <ParkingSpacePanel />
          </div>
        )}

        {activeTab === "scurve-settings" && (
          <div className="h-full">
            <SCurveSettingsPanel
              initialSettings={configurations?.scurve_settings}
              onSettingsChange={setScurveSettings}
            />
          </div>
        )}

        {activeTab === "dropdown-options" && (
          <div className="h-full">
            <DropdownOptionsPanel ref={dropdownOptionsRef} />
          </div>
        )}

        {activeTab === "system-defaults" && (
          <div className="h-full">
            <SystemDefaultsPanel
              initialSettings={configurations?.system_defaults}
              onSettingsChange={setSystemDefaultsSettings}
            />
          </div>
        )}
        </div>
      </div>
    </SuiteInnerShell>
  );
}
