"use client";

import { useState, useEffect } from "react";
import { Settings } from "lucide-react";

export interface SystemDefaultsSettings {
  maxBasementLevels: number;
  farDecimalPrecision: number;
  generalRequirementsDefault: number;
}

interface SystemDefaultsPanelProps {
  initialSettings?: SystemDefaultsSettings;
  onSettingsChange: (settings: SystemDefaultsSettings) => void;
}

const DEFAULT_SETTINGS: SystemDefaultsSettings = {
  maxBasementLevels: 2,
  farDecimalPrecision: 3,
  generalRequirementsDefault: 10,
};

export default function SystemDefaultsPanel({
  initialSettings,
  onSettingsChange,
}: SystemDefaultsPanelProps) {
  const [settings, setSettings] = useState<SystemDefaultsSettings>(
    initialSettings || DEFAULT_SETTINGS
  );

  useEffect(() => {
    onSettingsChange(settings);
  }, [settings, onSettingsChange]);

  const handleChange = (key: keyof SystemDefaultsSettings, value: number) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const settingsConfig = [
    {
      key: "maxBasementLevels" as const,
      label: "Max Basement Levels",
      suffix: "",
      min: 0,
      max: 10,
      step: 1,
      description: "Maximum number of basement levels allowed",
    },
    {
      key: "farDecimalPrecision" as const,
      label: "FAR Decimal Precision",
      suffix: "",
      min: 0,
      max: 6,
      step: 1,
      description: "Number of decimal places for FAR calculations",
    },
    {
      key: "generalRequirementsDefault" as const,
      label: "General Requirements Default",
      suffix: "%",
      min: 0,
      max: 100,
      step: 0.5,
      description: "Default general requirements percentage",
    },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-900/10 rounded-lg">
            <Settings className="w-5 h-5 text-zinc-900" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">System Defaults</h2>
            <p className="text-sm text-gray-500">
              Configure default values used throughout the application
            </p>
          </div>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settingsConfig.map((config) => (
            <div
              key={config.key}
              className="bg-gray-50 rounded-lg p-4 border border-gray-100"
            >
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {config.label}
              </label>
              <p className="text-xs text-gray-500 mb-3">{config.description}</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings[config.key]}
                  onChange={(e) =>
                    handleChange(config.key, parseFloat(e.target.value) || 0)
                  }
                  min={config.min}
                  max={config.max}
                  step={config.step}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-900"
                />
                {config.suffix && (
                  <span className="text-sm text-gray-500 font-medium w-8">
                    {config.suffix}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> These default values are used as initial values when creating new masterplans.
            Individual masterplans can override these defaults as needed.
          </p>
        </div>
      </div>
    </div>
  );
}
