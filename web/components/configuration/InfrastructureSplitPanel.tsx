"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { getInfrastructureRatesFromCostModel } from "@/utils/dropdownOptions";
import { updateConfiguration } from "@/actions/configuration";

interface InfrastructureSplitPanelProps {
  costModelEntries?: any[];
  initialSplit?: {
    primary: number;
    secondary: number;
  };
}

export default function InfrastructureSplitPanel({
  costModelEntries = [],
  initialSplit,
}: InfrastructureSplitPanelProps) {
  // Initialize from database configuration or use defaults
  const [primary, setPrimary] = useState(
    initialSplit?.primary?.toString() ?? "30"
  );
  const [secondary, setSecondary] = useState(
    initialSplit?.secondary?.toString() ?? "70"
  );
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  // Update state when initialSplit prop changes
  useEffect(() => {
    if (initialSplit) {
      setPrimary(initialSplit.primary?.toString() ?? "30");
      setSecondary(initialSplit.secondary?.toString() ?? "70");
    }
  }, [initialSplit]);

  // Calculate infrastructure rates from cost model (CSV) - read-only
  const infrastructureRates = useMemo(() => {
    return getInfrastructureRatesFromCostModel(costModelEntries);
  }, [costModelEntries]);

  // Validation
  const primaryNum = parseFloat(primary) || 0;
  const secondaryNum = parseFloat(secondary) || 0;
  const total = primaryNum + secondaryNum;
  const isValid = total === 100 && primaryNum >= 0 && secondaryNum >= 0;

  // Check if values have changed from initial
  const hasChanges =
    initialSplit &&
    (primaryNum !== initialSplit.primary ||
      secondaryNum !== initialSplit.secondary);

  // Handle save
  const handleSave = () => {
    if (!isValid) return;

    setSaveStatus({ type: null, message: "" });

    startTransition(async () => {
      const result = await updateConfiguration("infrastructure_split", {
        primary: primaryNum,
        secondary: secondaryNum,
      });

      if (result.success) {
        setSaveStatus({
          type: "success",
          message: "Infrastructure split saved successfully",
        });
        // Clear success message after 3 seconds
        setTimeout(() => setSaveStatus({ type: null, message: "" }), 3000);
      } else {
        setSaveStatus({
          type: "error",
          message: result.error || "Failed to save",
        });
      }
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-800">
          Infrastructure Configuration
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Manage infrastructure split and view rates from cost model.
        </p>
      </div>

      {/* Form Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Infrastructure Split Section */}
          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-2">
              Infrastructure Split
            </h3>

            {/* Primary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> Primary (%)
              </label>
              <input
                type="number"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                min="0"
                max="100"
                className="w-full max-w-xs px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
              />
            </div>

            {/* Secondary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> Secondary (%)
              </label>
              <input
                type="number"
                value={secondary}
                onChange={(e) => setSecondary(e.target.value)}
                min="0"
                max="100"
                className="w-full max-w-xs px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
              />
            </div>

            {/* Validation Message */}
            {!isValid && (
              <p className="text-xs text-red-600">
                Primary and Secondary must add up to 100% (currently {total}%)
              </p>
            )}

            {/* Save Button */}
            <div className="pt-4">
              <button
                onClick={handleSave}
                disabled={!isValid || isPending || !hasChanges}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isValid && hasChanges && !isPending
                    ? "bg-zinc-900 text-white hover:bg-zinc-800"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                {isPending ? "Saving..." : "Save Changes"}
              </button>

              {/* Status Message */}
              {saveStatus.type && (
                <p
                  className={`mt-2 text-xs ${
                    saveStatus.type === "success"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {saveStatus.message}
                </p>
              )}
            </div>
          </div>

          {/* Infrastructure Rates Section - Read Only */}
          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-2">
              Infrastructure Rates (SAR/m² GLA)
              <span className="ml-2 text-xs font-normal text-gray-500">
                From Cost Model
              </span>
            </h3>

            {/* Low Density Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Low Density
              </label>
              <input
                type="text"
                value={infrastructureRates.Low.toLocaleString()}
                readOnly
                disabled
                className="w-full max-w-xs px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>

            {/* Medium Density Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medium Density
              </label>
              <input
                type="text"
                value={infrastructureRates.Medium.toLocaleString()}
                readOnly
                disabled
                className="w-full max-w-xs px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>

            {/* High Density Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                High Density
              </label>
              <input
                type="text"
                value={infrastructureRates.High.toLocaleString()}
                readOnly
                disabled
                className="w-full max-w-xs px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>

            <p className="text-xs text-gray-500 italic">
              These rates are calculated from the Cost Model and update
              automatically when the Cost Model changes. To modify rates, update
              the Infrastructure entries in the Cost Modelling tab.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
