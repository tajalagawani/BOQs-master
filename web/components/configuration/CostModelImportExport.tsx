"use client";

import { useState, useRef, useTransition } from "react";
import { exportCostModelCSV, importCostModelCSV, clearCostModel } from "@/actions/configuration";

interface CostModelImportExportProps {
  onImportComplete?: () => void;
}

export default function CostModelImportExport({
  onImportComplete,
}: CostModelImportExportProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{
    type: "success" | "error" | "info" | null;
    message: string;
  }>({ type: null, message: "" });
  const [importMode, setImportMode] = useState<"replace" | "merge">("replace");
  const [showImportModal, setShowImportModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle CSV Export
  const handleExport = () => {
    setStatus({ type: null, message: "" });

    startTransition(async () => {
      const result = await exportCostModelCSV();

      if (result.success && result.data) {
        // Create blob and download
        const blob = new Blob([result.data], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `cost-model-export-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setStatus({
          type: "success",
          message: `Exported ${result.count?.toLocaleString()} entries successfully`,
        });
      } else {
        setStatus({
          type: "error",
          message: result.error || "Export failed",
        });
      }
    });
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      setStatus({ type: "error", message: "Please select a CSV file" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvData = event.target?.result as string;
      handleImport(csvData);
    };
    reader.onerror = () => {
      setStatus({ type: "error", message: "Failed to read file" });
    };
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle Clear All
  const handleClear = () => {
    setStatus({ type: null, message: "" });
    setShowClearModal(false);

    startTransition(async () => {
      const result = await clearCostModel();

      if (result.success) {
        setStatus({
          type: "success",
          message: `Cleared ${result.count?.toLocaleString()} entries successfully`,
        });
        onImportComplete?.();
      } else {
        setStatus({
          type: "error",
          message: result.error || "Clear failed",
        });
      }
    });
  };

  // Handle CSV Import
  const handleImport = (csvData: string) => {
    setStatus({ type: "info", message: "Importing..." });
    setShowImportModal(false);

    startTransition(async () => {
      const result = await importCostModelCSV(csvData, importMode);

      if (result.success) {
        const stats = result.stats;
        setStatus({
          type: "success",
          message: `Import complete: ${stats?.inserted.toLocaleString()} inserted, ${stats?.updated.toLocaleString()} updated, ${stats?.skipped.toLocaleString()} skipped`,
        });
        onImportComplete?.();
      } else {
        setStatus({
          type: "error",
          message: result.error || "Import failed",
        });
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          {isPending ? "Exporting..." : "Export CSV"}
        </button>

        {/* Import Button */}
        <button
          onClick={() => setShowImportModal(true)}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-zinc-900 text-white rounded-md hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          {isPending ? "Importing..." : "Import CSV"}
        </button>

        {/* Clear Button */}
        <button
          onClick={() => setShowClearModal(true)}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Clear All
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Status Message */}
      {status.type && (
        <div
          className={`px-4 py-2 rounded-md text-sm ${
            status.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : status.type === "error"
              ? "bg-red-50 text-red-800 border border-red-200"
              : "bg-blue-50 text-blue-800 border border-blue-200"
          }`}
        >
          {status.message}
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Clear All Cost Model Data
              </h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600">
                This will permanently delete <strong>all cost model entries</strong>. This action cannot be undone.
              </p>
              <p className="text-sm text-red-600 mt-2 font-medium">
                Are you sure you want to continue?
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Import Cost Model CSV
              </h3>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              {/* Import Mode Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Import Mode
                </label>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === "replace"}
                      onChange={() => setImportMode("replace")}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Replace All</div>
                      <div className="text-xs text-gray-500">
                        Delete all existing entries and import fresh data
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="importMode"
                      value="merge"
                      checked={importMode === "merge"}
                      onChange={() => setImportMode("merge")}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Merge</div>
                      <div className="text-xs text-gray-500">
                        Update existing entries and add new ones
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* CSV Format Info */}
              <div className="p-3 bg-gray-50 rounded-md">
                <div className="text-sm font-medium text-gray-700 mb-1">
                  Required CSV Columns:
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  assetClass, assetTypeL1, nrmLvl1, rcdcCostGfa
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Optional: assetFormL2, pricePoint, nrmLvl2, nrmLvl3, benchmarkedCostGfa, costBua, costGia, costGfa
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-md hover:bg-zinc-800"
              >
                Select CSV File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
