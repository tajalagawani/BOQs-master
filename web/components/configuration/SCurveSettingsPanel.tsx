"use client";

import { useState, useEffect } from "react";
import { Info } from "lucide-react";

export interface SCurveSettings {
  steepness: number;
  midpoint: number;
  defaultPhaseDuration: number;
  minPhaseDuration: number;
  maxPhaseDuration: number;
}

interface SCurveSettingsPanelProps {
  initialSettings?: SCurveSettings;
  onSettingsChange?: (settings: SCurveSettings) => void;
}

// Default S-curve settings
const DEFAULT_SETTINGS: SCurveSettings = {
  steepness: 10,
  midpoint: 0.5,
  defaultPhaseDuration: 36,
  minPhaseDuration: 6,
  maxPhaseDuration: 120,
};

export default function SCurveSettingsPanel({
  initialSettings,
  onSettingsChange,
}: SCurveSettingsPanelProps) {
  const [settings, setSettings] = useState<SCurveSettings>(
    initialSettings || DEFAULT_SETTINGS
  );

  // Notify parent when settings change
  const handleSettingsChange = (newSettings: SCurveSettings) => {
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  // Update local state when initialSettings prop changes
  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  // Calculate example S-curve values for visualization
  const calculateSCurveValue = (t: number, totalMonths: number): number => {
    const normalizedT = t / totalMonths;
    const exponent = -settings.steepness * (normalizedT - settings.midpoint);
    return 1 / (1 + Math.exp(exponent));
  };

  // Generate sample points for the S-curve description
  const samplePoints = [0.25, 0.5, 0.75, 1.0];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-800">S-Curve Settings</h2>
        <p className="text-xs text-gray-500 mt-1">
          Configure the S-curve (logistic function) parameters for cashflow modeling.
        </p>
      </div>

      {/* Settings Form */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* S-Curve Parameters Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Info className="w-4 h-4 text-gray-400" />
            S-Curve Parameters
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Steepness */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Steepness (k)
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="20"
                value={settings.steepness}
                onChange={(e) =>
                  handleSettingsChange({
                    ...settings,
                    steepness: parseFloat(e.target.value) || 10,
                  })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
              />
              <p className="text-xs text-gray-400 mt-1">
                Controls curve sharpness (higher = steeper)
              </p>
            </div>

            {/* Midpoint */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Midpoint
              </label>
              <input
                type="number"
                step="0.05"
                min="0.1"
                max="0.9"
                value={settings.midpoint}
                onChange={(e) =>
                  handleSettingsChange({
                    ...settings,
                    midpoint: parseFloat(e.target.value) || 0.5,
                  })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
              />
              <p className="text-xs text-gray-400 mt-1">
                Where inflection occurs (0.5 = middle)
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="p-3 bg-gray-50 rounded-md border border-gray-200 text-xs text-gray-600">
            <p className="font-medium text-gray-700 mb-2">S-Curve (Logistic Function) Formula:</p>
            <code className="block bg-white p-2 rounded border border-gray-100 mb-3 font-mono text-xs">
              S(t) = 1 / (1 + e<sup>-k(t/T - m)</sup>)
            </code>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong>t</strong> — Current month in the phase</li>
              <li><strong>T</strong> — Total months (phase duration)</li>
              <li><strong>k</strong> — Steepness parameter ({settings.steepness})</li>
              <li><strong>m</strong> — Midpoint parameter ({settings.midpoint})</li>
            </ul>
            <div className="mt-3 pt-2 border-t border-gray-100">
              <p className="font-medium text-gray-700 mb-1">Progress at key milestones:</p>
              <div className="grid grid-cols-4 gap-2 text-center">
                {samplePoints.map((point) => (
                  <div key={point} className="bg-white p-2 rounded border border-gray-100">
                    <div className="text-gray-500">{Math.round(point * 100)}%</div>
                    <div className="font-medium text-zinc-900">
                      {(calculateSCurveValue(point * 36, 36) * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Phase Duration Defaults Section */}
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700">Phase Duration Defaults</h3>

          <div className="grid grid-cols-3 gap-4">
            {/* Default Duration */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Default Duration (months)
              </label>
              <input
                type="number"
                min={settings.minPhaseDuration}
                max={settings.maxPhaseDuration}
                value={settings.defaultPhaseDuration}
                onChange={(e) =>
                  handleSettingsChange({
                    ...settings,
                    defaultPhaseDuration: parseInt(e.target.value) || 36,
                  })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
              />
            </div>

            {/* Min Duration */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Min Duration (months)
              </label>
              <input
                type="number"
                min="1"
                max={settings.maxPhaseDuration - 1}
                value={settings.minPhaseDuration}
                onChange={(e) =>
                  handleSettingsChange({
                    ...settings,
                    minPhaseDuration: parseInt(e.target.value) || 6,
                  })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
              />
            </div>

            {/* Max Duration */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Max Duration (months)
              </label>
              <input
                type="number"
                min={settings.minPhaseDuration + 1}
                max="240"
                value={settings.maxPhaseDuration}
                onChange={(e) =>
                  handleSettingsChange({
                    ...settings,
                    maxPhaseDuration: parseInt(e.target.value) || 120,
                  })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
              />
            </div>
          </div>

          <p className="text-xs text-gray-500">
            These values are used as defaults when creating new phases in a masterplan.
          </p>
        </div>

        {/* How It Works Section */}
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700">How S-Curve Works</h3>

          <div className="p-3 bg-blue-50 rounded-md border border-blue-100 text-xs text-blue-800">
            <p className="font-medium mb-2">Cashflow Modeling with S-Curves:</p>
            <ul className="space-y-1 list-disc list-inside text-blue-700">
              <li><strong>Start:</strong> Slow initial spending (mobilization, planning)</li>
              <li><strong>Middle:</strong> Rapid acceleration during peak construction</li>
              <li><strong>End:</strong> Gradual slowdown (finishing, commissioning)</li>
              <li><strong>Phases can overlap:</strong> Phase 2 can start before Phase 1 ends</li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
              <p className="font-medium text-gray-700 mb-1">Low Steepness (k = 5-8)</p>
              <p className="text-gray-600">Gradual curve, smoother spending distribution</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
              <p className="font-medium text-gray-700 mb-1">High Steepness (k = 12-15)</p>
              <p className="text-gray-600">Sharp curve, concentrated spending in middle</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-200 text-xs text-gray-500">
        Settings will be applied to all new cashflow calculations.
      </div>
    </div>
  );
}
