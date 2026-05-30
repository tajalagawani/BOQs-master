"use client";

import { useState, useCallback } from "react";
import { ChevronRightIcon, Pencil, Plus, Minus } from "lucide-react";

export interface TreeNode {
  id: string;
  label: string;
  type?: string;
  typeLabel?: string;
  children?: TreeNode[];
  expanded?: boolean;
  data?: Record<string, unknown>;
}

interface TreeViewProps {
  data: TreeNode;
  onNodeClick?: (node: TreeNode) => void;
  onNodeEdit?: (node: TreeNode) => void;
  onNodeAdd?: (node: TreeNode) => void;
  onNodeDelete?: (node: TreeNode) => void;
  selectedId?: string;
  searchTerm?: string;
}

interface TreeNodeItemProps {
  node: TreeNode;
  level: number;
  onNodeClick?: (node: TreeNode) => void;
  onNodeEdit?: (node: TreeNode) => void;
  onNodeAdd?: (node: TreeNode) => void;
  onNodeDelete?: (node: TreeNode) => void;
  selectedId?: string;
  searchTerm?: string;
  expandedNodes: Set<string>;
  toggleExpanded: (id: string) => void;
}

function matchesSearch(node: TreeNode, searchTerm: string): boolean {
  if (!searchTerm) return true;
  const term = searchTerm.toLowerCase();
  if (node.label.toLowerCase().includes(term)) return true;
  if (node.children) {
    return node.children.some((child) => matchesSearch(child, searchTerm));
  }
  return false;
}

function TreeNodeItem({
  node,
  level,
  onNodeClick,
  onNodeEdit,
  onNodeAdd,
  onNodeDelete,
  selectedId,
  searchTerm,
  expandedNodes,
  toggleExpanded,
}: TreeNodeItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);
  const isSelected = selectedId === node.id;
  const isRoot = node.type === "root" || node.id === "root";

  // Filter children based on search
  const filteredChildren = searchTerm
    ? node.children?.filter((child) => matchesSearch(child, searchTerm))
    : node.children;

  // Auto-expand if search matches children
  const shouldShow = !searchTerm || matchesSearch(node, searchTerm);
  if (!shouldShow) return null;

  const handleClick = () => {
    if (hasChildren) {
      toggleExpanded(node.id);
    }
    onNodeClick?.(node);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNodeEdit?.(node);
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNodeAdd?.(node);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNodeDelete?.(node);
  };

  return (
    <div>
      <div
        className={`
          flex items-center gap-1 py-1.5 px-2 cursor-pointer rounded
          hover:bg-gray-100 transition-colors group
          ${isSelected ? "bg-[#e8f5f2]" : ""}
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Expand/Collapse icon */}
        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
          {hasChildren && (
            <ChevronRightIcon
              className={`w-4 h-4 text-gray-400 transition-transform ${
                isExpanded ? "rotate-90" : ""
              }`}
            />
          )}
        </span>

        {/* Node content */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className={`text-sm truncate ${
              isRoot ? "font-semibold text-gray-800" : "text-gray-700"
            }`}
          >
            {node.label}
          </span>
          {node.typeLabel && (
            <span className="text-xs text-gray-400 flex-shrink-0">
              : {node.typeLabel}
            </span>
          )}
        </div>

        {/* Action icons - show on hover */}
        {isHovered && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* Edit - not for root */}
            {!isRoot && (
              <button
                onClick={handleEdit}
                className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {/* Add - for all nodes */}
            <button
              onClick={handleAdd}
              className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
              title="Add"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            {/* Delete - not for root */}
            {!isRoot && (
              <button
                onClick={handleDelete}
                className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-red-500 transition-colors"
                title="Delete"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {filteredChildren?.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              level={level + 1}
              onNodeClick={onNodeClick}
              onNodeEdit={onNodeEdit}
              onNodeAdd={onNodeAdd}
              onNodeDelete={onNodeDelete}
              selectedId={selectedId}
              searchTerm={searchTerm}
              expandedNodes={expandedNodes}
              toggleExpanded={toggleExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TreeView({
  data,
  onNodeClick,
  onNodeEdit,
  onNodeAdd,
  onNodeDelete,
  selectedId,
  searchTerm,
}: TreeViewProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    // Initially expand root
    return new Set(["root"]);
  });

  // Helper to find a node by ID
  const findNode = useCallback((node: TreeNode, id: string): TreeNode | null => {
    if (node.id === id) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findNode(child, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Auto-expand single children recursively
  const getAutoExpandIds = useCallback((node: TreeNode): string[] => {
    const ids: string[] = [node.id];
    if (node.children && node.children.length === 1) {
      ids.push(...getAutoExpandIds(node.children[0]));
    }
    return ids;
  }, []);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        // Add the clicked node
        next.add(id);
        // Auto-expand if single child
        const node = findNode(data, id);
        if (node?.children?.length === 1) {
          const autoIds = getAutoExpandIds(node.children[0]);
          autoIds.forEach(autoId => next.add(autoId));
        }
      }
      return next;
    });
  }, [data, findNode, getAutoExpandIds]);

  const expandAll = useCallback(() => {
    const allIds = new Set<string>();
    const collectIds = (node: TreeNode) => {
      allIds.add(node.id);
      node.children?.forEach(collectIds);
    };
    collectIds(data);
    setExpandedNodes(allIds);
  }, [data]);

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set(["root"]));
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Expand/Collapse buttons */}
      <div className="flex items-center gap-2 px-2 py-2 border-b border-gray-200">
        <button
          onClick={collapseAll}
          className="p-1 hover:bg-gray-100 rounded text-gray-500"
          title="Collapse All"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 12H4"
            />
          </svg>
        </button>
        <button
          onClick={expandAll}
          className="p-1 hover:bg-gray-100 rounded text-gray-500"
          title="Expand All"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>

      {/* Tree content */}
      <div className="flex-1 overflow-auto py-2">
        <TreeNodeItem
          node={data}
          level={0}
          onNodeClick={onNodeClick}
          onNodeEdit={onNodeEdit}
          onNodeAdd={onNodeAdd}
          onNodeDelete={onNodeDelete}
          selectedId={selectedId}
          searchTerm={searchTerm}
          expandedNodes={expandedNodes}
          toggleExpanded={toggleExpanded}
        />
      </div>
    </div>
  );
}
