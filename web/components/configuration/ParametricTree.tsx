"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { ParametricTreeNode } from "@/types/costModel";

interface ParametricTreeProps {
  tree: ParametricTreeNode;
  onNodeSelect?: (node: ParametricTreeNode | null) => void;
  selectedNodeId?: string;
}

interface TreeNodeProps {
  node: ParametricTreeNode;
  level: number;
  selectedNodeId?: string;
  onSelect: (node: ParametricTreeNode) => void;
}

function TreeNodeComponent({ node, level, selectedNodeId, onSelect }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedNodeId === node.id;

  const getTypeLabel = () => {
    switch (node.type) {
      case "root":
        return "Root:";
      case "parameter":
        return "Parameter:";
      case "option":
        return "Option:";
      default:
        return "";
    }
  };

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
    onSelect(node);
  };

  return (
    <div>
      <div
        className={`
          flex items-center gap-1 py-1.5 px-2 rounded cursor-pointer text-sm
          ${isSelected ? "bg-zinc-900/10 text-zinc-900" : "hover:bg-gray-100"}
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {hasChildren ? (
          <span className="w-4 h-4 flex items-center justify-center">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-zinc-900" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </span>
        ) : (
          <span className="w-4" />
        )}
        <span className="text-gray-500 text-xs">{getTypeLabel()}</span>
        <span className={`font-medium ${isSelected ? "text-zinc-900" : "text-gray-700"}`}>
          {node.label}
        </span>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              level={level + 1}
              selectedNodeId={selectedNodeId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ParametricTree({ tree, onNodeSelect, selectedNodeId }: ParametricTreeProps) {
  const handleSelect = (node: ParametricTreeNode) => {
    onNodeSelect?.(node);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-800">Parametric Tree</h2>
        <p className="text-xs text-gray-500 mt-1">
          Manage your parametric tree structure
        </p>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-auto p-2">
        <TreeNodeComponent
          node={tree}
          level={0}
          selectedNodeId={selectedNodeId}
          onSelect={handleSelect}
        />
      </div>
    </div>
  );
}
