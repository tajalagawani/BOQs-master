"use client";

import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Card } from "@/components/ui";
import { Plus, X } from "lucide-react";
import { getAllDropdownOptions } from "@/utils/dropdownOptions";

interface DropdownCategory {
  id: string;
  label: string;
  options: string[];
  editable: boolean; // Whether users can add/remove options
}

export interface DropdownOptionsPanelRef {
  save: () => Promise<boolean>;
}

const DropdownOptionsPanel = forwardRef<DropdownOptionsPanelRef>((props, ref) => {
  const [categories, setCategories] = useState<DropdownCategory[]>([]);
  const [newValues, setNewValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch cost model entries and saved filter options from API
    const fetchCostModelData = async () => {
      try {
        setIsLoading(true);

        // Fetch cost model entries, benchmark projects, and saved custom options
        const [costModelResponse, benchmarkProjectsResponse, savedOptionsResponse] = await Promise.all([
          fetch('/api/cost-model-entries'),
          fetch('/api/benchmark-projects'),
          fetch('/api/benchmark-filter-options')
        ]);

        const costModelEntries = await costModelResponse.json();
        const benchmarkProjects = await benchmarkProjectsResponse.json();
        const savedOptions = await savedOptionsResponse.json();

        // Extract unique project names and developers from benchmark projects
        const projectNames = Array.isArray(benchmarkProjects)
          ? [...new Set(benchmarkProjects.map((p: any) => p.name))].filter(Boolean).sort()
          : [];
        const developerNames = Array.isArray(benchmarkProjects)
          ? [...new Set(benchmarkProjects.map((p: any) => p.developer))].filter(Boolean).sort()
          : [];

        // Load all dropdown options with dynamic data from database
        const dbOptions = getAllDropdownOptions(costModelEntries);

        // Merge database options with saved custom options
        // Note: Use length check because empty arrays are truthy in JavaScript
        const loadedCategories: DropdownCategory[] = [
          {
            id: "assetClass",
            label: "Asset Class",
            options: savedOptions?.assetClass?.length > 0 ? savedOptions.assetClass : (dbOptions.assetClass || []),
            editable: true, // Can add/remove options
          },
          {
            id: "assetType",
            label: "Asset Type",
            options: savedOptions?.assetType?.length > 0 ? savedOptions.assetType : (dbOptions.assetTypeL1 || []),
            editable: true, // Can add/remove options
          },
          {
            id: "assetMassing",
            label: "Asset Massing",
            options: savedOptions?.assetMassing?.length > 0 ? savedOptions.assetMassing : (dbOptions.assetFormL2 || []),
            editable: true, // Can add/remove options
          },
          {
            id: "country",
            label: "Country",
            options: savedOptions?.country?.length > 0 ? savedOptions.country : ["Saudi Arabia", "UAE", "Qatar", "Bahrain", "Kuwait", "Oman"],
            editable: true,
          },
          {
            id: "city",
            label: "City",
            options: savedOptions?.city?.length > 0 ? savedOptions.city : ["Riyadh", "Jeddah", "Dammam", "Dubai", "Abu Dhabi", "Doha"],
            editable: true,
          },
          {
            id: "developer",
            label: "Developer",
            options: savedOptions?.developer?.length > 0 ? savedOptions.developer : developerNames,
            editable: true,
          },
          {
            id: "project",
            label: "Project",
            options: savedOptions?.project?.length > 0 ? savedOptions.project : projectNames,
            editable: true,
          },
        ];

        setCategories(loadedCategories);
      } catch (error) {
        console.error("Failed to fetch cost model data:", error);
        // Set empty categories on error
        setCategories([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCostModelData();
  }, []);

  // Expose save function to parent via ref
  useImperativeHandle(ref, () => ({
    save: async () => {
      try {
        // Convert categories array to object for saving
        const filterOptions: Record<string, string[]> = {};
        categories.forEach(cat => {
          filterOptions[cat.id] = cat.options;
        });

        const response = await fetch('/api/benchmark-filter-options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(filterOptions),
        });

        if (!response.ok) {
          throw new Error('Failed to save');
        }

        return true;
      } catch (error) {
        console.error('Error saving filter options:', error);
        return false;
      }
    },
  }));

  const handleAddOption = (categoryId: string) => {
    const value = newValues[categoryId]?.trim();
    if (!value) return;

    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id === categoryId && !cat.options.includes(value)) {
          return {
            ...cat,
            options: [...cat.options, value].sort(),
          };
        }
        return cat;
      })
    );

    setNewValues((prev) => ({ ...prev, [categoryId]: "" }));
  };

  const handleRemoveOption = (categoryId: string, option: string) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            options: cat.options.filter((opt) => opt !== option),
          };
        }
        return cat;
      })
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent, categoryId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddOption(categoryId);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Benchmarks Filter</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage filter options used in benchmarking and tables. Add or remove options to customize your filters.
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Loading cost model data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {categories.map((category) => (
            <Card key={category.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">{category.label}</h3>
                {!category.editable && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                    Read-only
                  </span>
                )}
              </div>

              {/* Options List */}
              <div className="space-y-1 mb-3 max-h-[200px] overflow-y-auto">
                {category.options.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No options</p>
                ) : (
                  category.options.map((option) => (
                    <div
                      key={option}
                      className="flex items-center justify-between bg-gray-50 px-2 py-1.5 rounded text-sm group"
                    >
                      <span className="text-gray-700">{option}</span>
                      {category.editable && (
                        <button
                          onClick={() => handleRemoveOption(category.id, option)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Add Option Input */}
              {category.editable && (
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={newValues[category.id] || ""}
                    onChange={(e) =>
                      setNewValues((prev) => ({
                        ...prev,
                        [category.id]: e.target.value,
                      }))
                    }
                    onKeyPress={(e) => handleKeyPress(e, category.id)}
                    placeholder="Add new option..."
                    className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                  />
                  <button
                    onClick={() => handleAddOption(category.id)}
                    className="px-2 py-1 text-white bg-zinc-900 hover:bg-zinc-800 rounded transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
        )}
      </div>

      {/* Save Notice */}
      <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500">
          <strong>Note:</strong> Changes will be saved when you click the Save button at the top of the page.
          The initial options are loaded from the database, but you can add or remove any option.
        </p>
      </div>
    </div>
  );
});

DropdownOptionsPanel.displayName = 'DropdownOptionsPanel';

export default DropdownOptionsPanel;
