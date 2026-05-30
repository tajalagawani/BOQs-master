"use client";

import { useState, useRef } from "react";
import { X, Upload, FileSpreadsheet, Check, AlertCircle } from "lucide-react";
import { importBenchmarkExcel } from "@/actions/benchmarking";

interface UploadProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadProjectModal({
  isOpen,
  onClose,
  onSuccess,
}: UploadProjectModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ success: boolean; message: string; projectsImported?: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
      ];
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
        setError("Please upload an Excel file (.xlsx, .xls) or CSV file");
        return;
      }
      setFile(selectedFile);
      setError("");
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (!droppedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
        setError("Please upload an Excel file (.xlsx, .xls) or CSV file");
        return;
      }
      setFile(droppedFile);
      setError("");
      setResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await importBenchmarkExcel(formData);

      if (response.success) {
        setResult({
          success: true,
          message: response.message || "Import successful",
          projectsImported: response.projectsImported,
        });
        // Wait a moment then close and refresh
        setTimeout(() => {
          onSuccess();
          onClose();
          setFile(null);
          setResult(null);
        }, 2000);
      } else {
        setError(response.error || "Failed to import file");
      }
    } catch (err) {
      setError("An error occurred while uploading the file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError("");
    setResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Upload Benchmark Data</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {result?.success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 flex items-center gap-2">
            <Check className="w-5 h-5 flex-shrink-0" />
            <span>{result.message} {result.projectsImported && `(${result.projectsImported} projects imported)`}</span>
          </div>
        )}

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            file
              ? "border-zinc-900 bg-zinc-900/5"
              : "border-gray-300 hover:border-zinc-900 hover:bg-gray-50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />

          {file ? (
            <div className="flex flex-col items-center gap-3">
              <FileSpreadsheet className="w-12 h-12 text-zinc-900" />
              <div>
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Remove file
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-12 h-12 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">
                  Drop your Excel file here
                </p>
                <p className="text-sm text-gray-500">
                  or click to browse (.xlsx, .xls, .csv)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Expected Format Info */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-sm text-blue-700 font-medium mb-1">Expected Format:</p>
          <ul className="text-xs text-blue-600 list-disc list-inside space-y-1">
            <li>Columns: Project names (e.g., "PROJECT 1 Low Rise")</li>
            <li>Rows: NRM categories (Substructure, Superstructure, etc.)</li>
            <li>Values: Cost per GFA rates</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end mt-6">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <span className="animate-spin">⏳</span>
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Import Data
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
