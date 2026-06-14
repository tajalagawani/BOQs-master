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
    <div className="suite fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="suite-shadow bg-suite-panel rounded-[18px] p-6 max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[18px] font-semibold text-suite-ink">Upload Benchmark Data</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-suite-card-soft rounded-full text-suite-ink-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-suite-dang-bg border border-suite-line text-suite-dang px-4 py-3 rounded-[10px] mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {result?.success && (
          <div className="bg-suite-good-bg border border-suite-line text-suite-good px-4 py-3 rounded-[10px] mb-4 flex items-center gap-2">
            <Check className="w-5 h-5 flex-shrink-0" />
            <span>{result.message} {result.projectsImported && `(${result.projectsImported} projects imported)`}</span>
          </div>
        )}

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-[12px] p-8 text-center cursor-pointer transition-colors ${
            file
              ? "border-suite-navy bg-suite-card-soft"
              : "border-suite-line-2 hover:border-suite-navy hover:bg-suite-card-soft"
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
              <FileSpreadsheet className="w-12 h-12 text-suite-navy" />
              <div>
                <p className="font-medium text-suite-ink">{file.name}</p>
                <p className="text-sm text-suite-ink-3">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="text-sm text-suite-dang hover:opacity-80"
              >
                Remove file
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-12 h-12 text-suite-ink-4" />
              <div>
                <p className="font-medium text-suite-ink">
                  Drop your Excel file here
                </p>
                <p className="text-sm text-suite-ink-3">
                  or click to browse (.xlsx, .xls, .csv)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Expected Format Info */}
        <div className="mt-4 bg-suite-blue-soft border border-suite-line rounded-[10px] p-3">
          <p className="text-sm text-suite-blue font-medium mb-1">Expected Format:</p>
          <ul className="text-xs text-suite-blue list-disc list-inside space-y-1">
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
            className="px-[15px] h-9 text-[12.5px] font-semibold text-suite-ink-2 bg-white border border-suite-line-2 hover:border-suite-ink-4 rounded-full inline-flex items-center"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="px-[15px] h-9 text-[12.5px] font-semibold text-white bg-suite-btn border border-suite-btn hover:bg-suite-navy-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
