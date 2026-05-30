"use client";

import { useState } from "react";

export default function DensityRangeFactorPanel() {
  const [lowToUse, setLowToUse] = useState("0,465");
  const [midToUse, setMidToUse] = useState("1,5");

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-800">Density Range Factor</h2>
        <p className="text-xs text-gray-500 mt-1">
          Manage your density range factor parameters here.
        </p>
      </div>

      {/* Form Content */}
      <div className="flex-1 p-6">
        <div className="max-w-xs space-y-6">
          {/* Low to use */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span className="text-red-500">*</span> Low to use
            </label>
            <input
              type="text"
              value={lowToUse}
              onChange={(e) => setLowToUse(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
            />
          </div>

          {/* Mid to use */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span className="text-red-500">*</span> Mid to use
            </label>
            <input
              type="number"
              step="0.1"
              value={midToUse.replace(",", ".")}
              onChange={(e) => setMidToUse(e.target.value.replace(".", ","))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
