"use client";

import { useState } from "react";

export default function ParkingSpacePanel() {
  const [onGrade, setOnGrade] = useState("35");
  const [basement, setBasement] = useState("45");
  const [podium, setPodium] = useState("35");
  const [separateStructure, setSeparateStructure] = useState("40");

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-800">Parking Space</h2>
        <p className="text-xs text-gray-500 mt-1">
          Manage your parking space here.
        </p>
      </div>

      {/* Form Content */}
      <div className="flex-1 p-6">
        <div className="max-w-xs space-y-6">
          {/* On Grade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              On Grade (m2/space)
            </label>
            <input
              type="number"
              value={onGrade}
              onChange={(e) => setOnGrade(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
            />
          </div>

          {/* Basement */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Basement (Up to Two Levels) (m2/space)
            </label>
            <input
              type="number"
              value={basement}
              onChange={(e) => setBasement(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
            />
          </div>

          {/* Podium */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Podium (m2/space)
            </label>
            <input
              type="number"
              value={podium}
              onChange={(e) => setPodium(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
            />
          </div>

          {/* Separate Structure - Multi Storey */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Separate Structure - Multi Storey (m2/space)
            </label>
            <input
              type="number"
              value={separateStructure}
              onChange={(e) => setSeparateStructure(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
