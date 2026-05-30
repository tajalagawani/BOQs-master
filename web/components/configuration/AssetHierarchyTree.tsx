"use client";

import { useState, useMemo } from "react";
import { Search, X, AlertTriangle } from "lucide-react";
import TreeView, { TreeNode } from "@/components/ui/TreeView";

interface CostModelEntry {
  assetClass: string;
  assetTypeL1: string;
  assetFormL2: string;
  pricePoint: string;
  extraPath: string;
}

type NodeContext = {
  assetClass?: string;
  assetTypeL1?: string;
  assetFormL2?: string;
  pricePoint?: string;
  extraPath?: string;
};

interface AssetHierarchyTreeProps {
  onNodeSelect?: (node: TreeNode) => void;
  selectedNodeId?: string;
  costModelEntries: CostModelEntry[];
  onAddEntry?: (entry: NodeContext) => Promise<void>;
  onEditEntry?: (oldValue: string, newValue: string, level: string, context: NodeContext) => Promise<void>;
  onDeleteEntry?: (entry: NodeContext) => Promise<void>;
}

type ModalMode = "add" | "edit" | "delete" | null;

interface ModalState {
  mode: ModalMode;
  node: TreeNode | null;
  level: string;
  context: NodeContext;
}

// Determine node level from ID
function getNodeLevel(nodeId: string): string {
  if (nodeId === "root") return "root";
  if (nodeId.startsWith("class-")) return "assetClass";
  if (nodeId.startsWith("type-")) return "assetTypeL1";
  if (nodeId.startsWith("form-")) return "assetFormL2";
  if (nodeId.startsWith("price-")) return "pricePoint";
  if (nodeId.startsWith("extra-")) return "extraLevel";
  return "unknown";
}

// Get level label
function getLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    assetClass: "Asset Class",
    assetTypeL1: "Asset Type (L1)",
    assetFormL2: "Asset Form (L2)",
    pricePoint: "Price Point",
    extraLevel: "Sub Level",
  };
  return labels[level] ?? "Sub Level";
}

// Build the full asset hierarchy tree from cost model entries
function buildAssetHierarchy(entries: CostModelEntry[]): TreeNode {
  const root: TreeNode = { id: "root", label: "Asset Hierarchy", children: [] };
  const nodeMap = new Map<string, TreeNode>();
  nodeMap.set("root", root);

  for (const entry of entries) {
    if (!entry.assetClass || entry.assetClass === "-") continue;

    // Level 1 — Asset Class
    const classId = `class-${entry.assetClass}`;
    if (!nodeMap.has(classId)) {
      const node: TreeNode = {
        id: classId,
        label: entry.assetClass,
        children: [],
        data: { assetClass: entry.assetClass },
      };
      nodeMap.set(classId, node);
      root.children!.push(node);
    }

    if (!entry.assetTypeL1 || entry.assetTypeL1 === "-") continue;

    // Level 2 — Asset Type L1
    const typeId = `type-${entry.assetClass}__${entry.assetTypeL1}`;
    if (!nodeMap.has(typeId)) {
      const node: TreeNode = {
        id: typeId,
        label: entry.assetTypeL1,
        children: [],
        data: { assetClass: entry.assetClass, assetTypeL1: entry.assetTypeL1 },
      };
      nodeMap.set(typeId, node);
      nodeMap.get(classId)!.children!.push(node);
    }

    if (!entry.assetFormL2 || entry.assetFormL2 === "-") continue;

    // Level 3 — Asset Form L2
    const formId = `form-${entry.assetClass}__${entry.assetTypeL1}__${entry.assetFormL2}`;
    if (!nodeMap.has(formId)) {
      const node: TreeNode = {
        id: formId,
        label: entry.assetFormL2,
        children: [],
        data: {
          assetClass: entry.assetClass,
          assetTypeL1: entry.assetTypeL1,
          assetFormL2: entry.assetFormL2,
        },
      };
      nodeMap.set(formId, node);
      nodeMap.get(typeId)!.children!.push(node);
    }

    if (!entry.pricePoint || entry.pricePoint === "-") continue;

    // Level 4 — Price Point
    const priceId = `price-${entry.assetClass}__${entry.assetTypeL1}__${entry.assetFormL2}__${entry.pricePoint}`;
    if (!nodeMap.has(priceId)) {
      const node: TreeNode = {
        id: priceId,
        label: entry.pricePoint,
        children: [],
        data: {
          assetClass: entry.assetClass,
          assetTypeL1: entry.assetTypeL1,
          assetFormL2: entry.assetFormL2,
          pricePoint: entry.pricePoint,
          extraPath: "",
        },
      };
      nodeMap.set(priceId, node);
      nodeMap.get(formId)!.children!.push(node);
    }

    // Extra levels — unlimited depth via extraPath ("A/B/C/...")
    if (entry.extraPath) {
      const parts = entry.extraPath.split("/").filter(Boolean);
      let parentId = priceId;

      for (let i = 0; i < parts.length; i++) {
        const pathSoFar = parts.slice(0, i + 1).join("/");
        const extraId = `extra-${entry.assetClass}__${entry.assetTypeL1}__${entry.assetFormL2}__${entry.pricePoint}__${pathSoFar}`;

        if (!nodeMap.has(extraId)) {
          const node: TreeNode = {
            id: extraId,
            label: parts[i],
            children: [],
            data: {
              assetClass: entry.assetClass,
              assetTypeL1: entry.assetTypeL1,
              assetFormL2: entry.assetFormL2,
              pricePoint: entry.pricePoint,
              extraPath: pathSoFar,
            },
          };
          nodeMap.set(extraId, node);
          nodeMap.get(parentId)!.children!.push(node);
        }
        parentId = extraId;
      }
    }
  }

  return root;
}

export default function AssetHierarchyTree({
  onNodeSelect,
  selectedNodeId,
  costModelEntries,
  onAddEntry,
  onEditEntry,
  onDeleteEntry,
}: AssetHierarchyTreeProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [modalState, setModalState] = useState<ModalState>({
    mode: null,
    node: null,
    level: "",
    context: {},
  });
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const assetHierarchy = useMemo(
    () => buildAssetHierarchy(costModelEntries || []),
    [costModelEntries]
  );

  const getContext = (node: TreeNode): NodeContext =>
    (node.data as NodeContext) ?? {};

  const handleEdit = (node: TreeNode) => {
    setErrorMessage(null);
    const level = getNodeLevel(node.id);
    setModalState({ mode: "edit", node, level, context: getContext(node) });
    setInputValue(node.label);
  };

  const handleAdd = (node: TreeNode) => {
    setErrorMessage(null);
    const currentLevel = getNodeLevel(node.id);
    const context = getContext(node);

    const fixedLevels = ["assetClass", "assetTypeL1", "assetFormL2", "pricePoint"];
    let nextLevel: string;

    if (node.id === "root") {
      nextLevel = "assetClass";
    } else if (fixedLevels.includes(currentLevel)) {
      const idx = fixedLevels.indexOf(currentLevel);
      nextLevel = idx < fixedLevels.length - 1 ? fixedLevels[idx + 1] : "extraLevel";
    } else {
      // already in extraLevel — go one deeper
      nextLevel = "extraLevel";
    }

    setModalState({ mode: "add", node, level: nextLevel, context });
    setInputValue("");
  };

  const handleDelete = (node: TreeNode) => {
    setErrorMessage(null);
    const level = getNodeLevel(node.id);
    setModalState({ mode: "delete", node, level, context: getContext(node) });
  };

  const closeModal = () => {
    setModalState({ mode: null, node: null, level: "", context: {} });
    setInputValue("");
    setIsLoading(false);
    setErrorMessage(null);
  };

  const handleSubmit = async () => {
    if (!modalState.mode) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (modalState.mode === "add" && onAddEntry) {
        if (modalState.level === "extraLevel") {
          const currentExtraPath = modalState.context.extraPath ?? "";
          const newExtraPath = currentExtraPath
            ? `${currentExtraPath}/${inputValue}`
            : inputValue;
          await onAddEntry({ ...modalState.context, extraPath: newExtraPath });
        } else {
          await onAddEntry({ ...modalState.context, [modalState.level]: inputValue });
        }
      } else if (modalState.mode === "edit" && onEditEntry && modalState.node) {
        await onEditEntry(
          modalState.node.label,
          inputValue,
          modalState.level,
          modalState.context
        );
      } else if (modalState.mode === "delete" && onDeleteEntry) {
        await onDeleteEntry(modalState.context);
      }
      closeModal();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Operation failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col relative">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-gray-800">Asset Hierarchy</h2>
        </div>
        <p className="text-xs text-gray-500">
          Manage your asset classification structure
        </p>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-hidden">
        <TreeView
          data={assetHierarchy}
          onNodeClick={onNodeSelect}
          onNodeEdit={handleEdit}
          onNodeAdd={handleAdd}
          onNodeDelete={handleDelete}
          selectedId={selectedNodeId}
          searchTerm={searchTerm}
        />
      </div>

      {/* Standalone error (no form open) */}
      {errorMessage && !modalState.mode && (
        <div className="border-t border-gray-200 p-4 bg-red-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="p-1 hover:bg-red-100 rounded text-red-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Inline form */}
      {modalState.mode && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          {modalState.mode === "delete" ? (
            <div>
              <div className="flex items-center gap-2 mb-3 text-red-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Delete {modalState.node?.label}?
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                This will remove all associated cost model entries.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={closeModal}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded border border-gray-300"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-sm text-white bg-red-500 hover:bg-red-600 rounded disabled:opacity-50"
                >
                  {isLoading ? "..." : "Delete"}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex gap-4 mb-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={
                      modalState.mode === "edit"
                        ? modalState.node?.label
                        : "Enter value..."
                    }
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && inputValue.trim()) handleSubmit();
                      if (e.key === "Escape") closeModal();
                    }}
                  />
                </div>
                <div className="flex-1">
                  <div className="px-3 py-2.5 text-sm border border-gray-300 rounded-md bg-white text-gray-500">
                    {getLevelLabel(modalState.level)}
                  </div>
                </div>
              </div>
              {errorMessage && (
                <div className="flex items-center gap-2 mb-3 text-red-600 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{errorMessage}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={closeModal}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded border border-gray-300"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || !inputValue.trim()}
                  className="px-3 py-1.5 text-sm text-white bg-zinc-900 hover:bg-zinc-800 rounded disabled:opacity-50"
                >
                  {isLoading ? "..." : modalState.mode === "edit" ? "Save" : "Add"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
