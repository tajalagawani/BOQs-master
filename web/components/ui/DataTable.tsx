/**
 * DataTable — generic editable section table. Ported verbatim from
 * roshn/src/components/ui/DataTable.tsx with brand colours swapped
 * for IOX zinc.
 *
 * Features kept exactly:
 *   • Column-group headers and column-end borders
 *   • Sticky header + sticky right Actions column
 *   • Per-column resize (mouse drag right edge)
 *   • Inline editing for `highlighted` columns:
 *       - dropdown when column has options (static or row-dependent)
 *       - number input when format is "number" | "percentage"
 *       - text input otherwise
 *   • Badge render for Low/Medium/High density columns
 *   • Default values for empty cells
 *   • Zebra striping + empty message + footer slot
 *   • Cascading dropdown options (function form of provider)
 */
"use client";

import {
  ReactNode,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatNumber, formatPercentage } from "@/utils/formatters";
import type { TableConfig, ColumnConfig } from "@/types/table";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  TableGroupHeader,
  TableFooter,
} from "./Table";

interface EditingCell {
  rowId: string;
  columnKey: string;
}

type DataRow = Record<string, unknown> & { id: string };

type DropdownOptionsProvider =
  | Record<string, string[]>
  | ((row: DataRow) => Record<string, string[]>);

interface Props {
  config: TableConfig;
  data: DataRow[];
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, key: string, value: unknown) => void;
  dropdownOptions?: DropdownOptionsProvider;
  footer?: ReactNode;
}

function formatValue(value: unknown, column: ColumnConfig): ReactNode {
  if (value === null || value === undefined || value === "") {
    return column.defaultValue || "—";
  }
  if (column.render === "badge" && typeof value === "string") {
    const colorMap: Record<string, string> = {
      High: "bg-rose-100 text-rose-800",
      Medium: "bg-amber-100 text-amber-800",
      Low: "bg-emerald-100 text-emerald-800",
    };
    return (
      <span
        className={cn(
          "inline-flex px-2 py-0.5 rounded text-[11px] font-medium",
          colorMap[value] || "bg-zinc-100 text-zinc-800",
        )}
      >
        {value}
        {value === "High" || value === "Medium" || value === "Low"
          ? " Density"
          : ""}
      </span>
    );
  }
  switch (column.format) {
    case "number":
      return typeof value === "number" ? formatNumber(value) : String(value);
    case "percentage":
      return typeof value === "number"
        ? formatPercentage(value)
        : String(value);
    case "currency":
      return typeof value === "number" ? formatNumber(value) : String(value);
    default:
      return String(value);
  }
}

function getCellClassName(column: ColumnConfig, isGroupEnd: boolean): string {
  return cn(
    column.groupEnd || isGroupEnd
      ? "border-r border-zinc-400/60"
      : "border-r border-zinc-200",
    column.highlighted && "!bg-emerald-50",
    column.className,
  );
}

function resolveDropdownOptions(
  provider: DropdownOptionsProvider | undefined,
  row: DataRow,
): Record<string, string[]> {
  if (!provider) return {};
  if (typeof provider === "function") return provider(row);
  return provider;
}

function renderEditableCell(
  column: ColumnConfig,
  value: unknown,
  rowId: string,
  row: DataRow,
  isEditing: boolean,
  dropdownProvider: DropdownOptionsProvider | undefined,
  onUpdate?: (id: string, key: string, value: unknown) => void,
  onStartEdit?: () => void,
  onFinishEdit?: () => void,
): ReactNode {
  const dropdownOptions = resolveDropdownOptions(dropdownProvider, row);

  // Read view (click to edit)
  if (!isEditing) {
    return (
      <div
        onClick={onStartEdit}
        className="cursor-pointer hover:bg-white/60 px-2 py-1 rounded h-7 flex items-center w-full"
      >
        {formatValue(value, column)}
      </div>
    );
  }

  // Dropdown
  if (dropdownOptions[column.key]) {
    const options = dropdownOptions[column.key];
    return (
      <select
        value={(value as string) || ""}
        onChange={(e) => {
          onUpdate?.(rowId, column.key, e.target.value);
          onFinishEdit?.();
        }}
        onBlur={onFinishEdit}
        autoFocus
        className="w-full h-7 px-1.5 text-[12.5px] bg-white border border-zinc-300 rounded focus:outline-none focus:border-zinc-900"
      >
        <option value="">Select…</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  // Number input
  if (column.format === "number" || column.format === "percentage") {
    return (
      <input
        type="number"
        value={(value as number | string) ?? ""}
        onChange={(e) =>
          onUpdate?.(
            rowId,
            column.key,
            parseFloat(e.target.value) || 0,
          )
        }
        onBlur={onFinishEdit}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Escape") onFinishEdit?.();
        }}
        autoFocus
        className="w-full h-7 px-2 text-[12.5px] text-right border border-zinc-300 rounded focus:outline-none focus:border-zinc-900"
      />
    );
  }

  // Text
  return (
    <input
      type="text"
      value={(value as string) ?? ""}
      onChange={(e) => onUpdate?.(rowId, column.key, e.target.value)}
      onBlur={onFinishEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "Escape") onFinishEdit?.();
      }}
      autoFocus
      className="w-full h-7 px-2 text-[12.5px] border border-zinc-300 rounded focus:outline-none focus:border-zinc-900"
    />
  );
}

export default function DataTable({
  config,
  data,
  onDelete,
  onUpdate,
  dropdownOptions = {},
  footer,
}: Props) {
  const { columnGroups, columns, features = {} } = config;
  const {
    zebra = true,
    stickyHeader = true,
    stickyActions = true,
    showDragHint = false,
    emptyMessage = "No data available.",
  } = features;

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    () => {
      const widths: Record<string, number> = {};
      columns.forEach((c) => {
        widths[c.key] = 120;
      });
      return widths;
    },
  );

  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);

  const resizingRef = useRef<{
    columnKey: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, columnKey: string) => {
      e.preventDefault();
      resizingRef.current = {
        columnKey,
        startX: e.clientX,
        startWidth: columnWidths[columnKey] || 120,
      };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [columnWidths],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const cur = resizingRef.current;
      if (!cur) return;
      const diff = e.clientX - cur.startX;
      const w = Math.max(50, cur.startWidth + diff);
      setColumnWidths((prev) => ({ ...prev, [cur.columnKey]: w }));
    };
    const onUp = () => {
      resizingRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <>
      {showDragHint && (
        <p className="text-[11px] text-zinc-500 mb-2">
          Drag a column edge to resize.
        </p>
      )}
      <div className="border border-zinc-200 rounded-xl overflow-hidden">
        <Table
          caption={config.caption}
          zebra={zebra}
          className="whitespace-nowrap"
          style={{ tableLayout: "fixed" }}
        >
          <colgroup>
            {columns.map((c) => (
              <col key={c.key} style={{ width: columnWidths[c.key] }} />
            ))}
            {onDelete && <col style={{ width: 80 }} />}
          </colgroup>

          <TableHead sticky={stickyHeader}>
            {columnGroups && columnGroups.length > 0 && (
              <TableRow className="bg-zinc-100 border-b border-zinc-400/60">
                {columnGroups.map((g, i) => (
                  <TableGroupHeader
                    key={i}
                    colSpan={g.colSpan}
                    noBorder={g.noBorder}
                  >
                    {g.label}
                  </TableGroupHeader>
                ))}
                {onDelete && stickyActions && (
                  <TableHeaderCell
                    className="sticky right-0 z-30 bg-zinc-100"
                    scope="col"
                  />
                )}
              </TableRow>
            )}

            <TableRow className="bg-zinc-100 border-b border-zinc-400/60">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  style={{
                    width: columnWidths[column.key],
                    minWidth: 50,
                  }}
                  className={cn(
                    "relative px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-600",
                    column.align === "right" && "text-right",
                    column.align === "center" && "text-center",
                    column.align !== "right" &&
                      column.align !== "center" &&
                      "text-left",
                    column.groupEnd
                      ? "border-r border-zinc-400/60"
                      : "border-r border-zinc-200",
                  )}
                >
                  <span className="pr-3">{column.label}</span>
                  <div
                    className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-zinc-900/30 active:bg-zinc-900/40 z-10"
                    style={{ touchAction: "none" }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleMouseDown(e, column.key);
                    }}
                  />
                </th>
              ))}
              {onDelete && (
                <TableHeaderCell
                  scope="col"
                  align="center"
                  sticky={stickyActions ? "right" : undefined}
                  className={
                    stickyActions ? "z-30 bg-zinc-100" : ""
                  }
                >
                  Actions
                </TableHeaderCell>
              )}
            </TableRow>
          </TableHead>

          <TableBody>
            {data.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                {columns.map((column, i) => (
                  <TableCell
                    key={column.key}
                    align={i === 0 ? "left" : column.align || "left"}
                    className={cn(
                      "py-4",
                      getCellClassName(column, false),
                      i === 0 && "text-zinc-500",
                    )}
                  >
                    {i === 0 ? emptyMessage : "—"}
                  </TableCell>
                ))}
                {onDelete && (
                  <TableCell
                    align="center"
                    sticky={stickyActions ? "right" : undefined}
                    className={stickyActions ? "z-20 bg-white" : ""}
                  >
                    —
                  </TableCell>
                )}
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id}>
                  {columns.map((column) => {
                    const value = column.key.startsWith("_")
                      ? column.defaultValue
                      : row[column.key];
                    const isEditable = column.highlighted && onUpdate;
                    const isCellEditing =
                      editingCell?.rowId === row.id &&
                      editingCell?.columnKey === column.key;

                    return (
                      <TableCell
                        key={column.key}
                        align={column.align || "left"}
                        numeric={
                          column.format === "number" ||
                          column.format === "currency"
                        }
                        className={getCellClassName(column, false)}
                      >
                        {isEditable
                          ? renderEditableCell(
                              column,
                              value,
                              row.id,
                              row,
                              isCellEditing,
                              dropdownOptions,
                              onUpdate,
                              () =>
                                setEditingCell({
                                  rowId: row.id,
                                  columnKey: column.key,
                                }),
                              () => setEditingCell(null),
                            )
                          : formatValue(value, column)}
                      </TableCell>
                    );
                  })}
                  {onDelete && (
                    <TableCell
                      align="center"
                      sticky={stickyActions ? "right" : undefined}
                      className={
                        stickyActions
                          ? "z-20 bg-white border-l border-zinc-100"
                          : ""
                      }
                    >
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => onDelete(row.id)}
                        className="size-7 inline-flex items-center justify-center rounded-md text-zinc-500 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash2 className="size-3.5" strokeWidth={1.75} />
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>

          {footer && <TableFooter>{footer}</TableFooter>}
        </Table>
      </div>
    </>
  );
}
