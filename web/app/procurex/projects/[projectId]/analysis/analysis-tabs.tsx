"use client"

import { useState } from "react"
import type {
  OmniDetailedAnalysis,
  RateAnalysisRow,
  UnpricedRow,
  ArithmeticalRow,
  DeviationRow,
} from "@/lib/procurex/data/omni-data"

type TabKey =
  | "high-rates"
  | "low-rates"
  | "unpriced"
  | "arithmetical"
  | "commercial-dev"
  | "technical-dev"

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "high-rates", label: "High Rates" },
  { key: "low-rates", label: "Low Rates" },
  { key: "unpriced", label: "Unpriced Items" },
  { key: "arithmetical", label: "Arithmetical Errors" },
  { key: "commercial-dev", label: "Commercial Dev." },
  { key: "technical-dev", label: "Technical Dev." },
]

const formatCurrency = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function ValidateToggle() {
  const [on, setOn] = useState(false)
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setOn((v) => !v)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        on ? "bg-emerald-500" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  )
}

function RateTable({
  title,
  rows,
  variancePositive,
}: {
  title: string
  rows: RateAnalysisRow[]
  variancePositive: boolean
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">No items</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500">
                <th className="text-left font-medium py-3 pr-4">Item ID</th>
                <th className="text-left font-medium py-3 pr-4">Description</th>
                <th className="text-left font-medium py-3 pr-4">Unit</th>
                <th className="text-right font-medium py-3 pr-4">Rate</th>
                <th className="text-right font-medium py-3 pr-4">Benchmark</th>
                <th className="text-right font-medium py-3 pr-4">Variance %</th>
                <th className="text-left font-medium py-3 pr-4">
                  Bidder Comparison
                </th>
                <th className="text-left font-medium py-3">Validate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row) => {
                const varianceColor =
                  (variancePositive && row.variancePct > 0) ||
                  (!variancePositive && row.variancePct < 0)
                    ? "text-red-500"
                    : "text-emerald-600"
                return (
                  <tr key={row.id}>
                    <td className="py-3 pr-4 text-gray-900">{row.itemId}</td>
                    <td className="py-3 pr-4 text-gray-700">
                      {row.description}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">{row.unit}</td>
                    <td className="py-3 pr-4 text-right text-gray-900">
                      {formatCurrency(row.rate)}
                    </td>
                    <td className="py-3 pr-4 text-right text-gray-700">
                      {formatCurrency(row.benchmark)}
                    </td>
                    <td
                      className={`py-3 pr-4 text-right font-medium ${varianceColor}`}
                    >
                      {row.variancePct > 0 ? "+" : ""}
                      {row.variancePct.toFixed(1)}%
                    </td>
                    <td className="py-3 pr-4 text-gray-700">
                      {row.bidderComparison}
                    </td>
                    <td className="py-3">
                      <ValidateToggle />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function UnpricedTable({ rows }: { rows: UnpricedRow[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        Unpriced Items Analysis
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">No items</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500">
                <th className="text-left font-medium py-3 pr-4">Item ID</th>
                <th className="text-left font-medium py-3 pr-4">Description</th>
                <th className="text-left font-medium py-3 pr-4">Unit</th>
                <th className="text-left font-medium py-3 pr-4">Bidder</th>
                <th className="text-left font-medium py-3 pr-4">Status</th>
                <th className="text-left font-medium py-3">Validate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="py-3 pr-4 text-gray-900">{row.itemId}</td>
                  <td className="py-3 pr-4 text-gray-700">{row.description}</td>
                  <td className="py-3 pr-4 text-gray-700">{row.unit}</td>
                  <td className="py-3 pr-4 text-gray-700">{row.bidder}</td>
                  <td className="py-3 pr-4 text-gray-700">{row.status}</td>
                  <td className="py-3">
                    <ValidateToggle />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ArithmeticalTable({ rows }: { rows: ArithmeticalRow[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        Arithmetical Errors Analysis
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">No items</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500">
                <th className="text-left font-medium py-3 pr-4">Bidder</th>
                <th className="text-right font-medium py-3 pr-4">Tender Sum</th>
                <th className="text-right font-medium py-3 pr-4">
                  Error Amount
                </th>
                <th className="text-right font-medium py-3 pr-4">
                  Adjusted Sum
                </th>
                <th className="text-left font-medium py-3">Validate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="py-3 pr-4 text-gray-900">{row.bidder}</td>
                  <td className="py-3 pr-4 text-right text-gray-700">
                    {formatCurrency(row.tenderSum)}
                  </td>
                  <td className="py-3 pr-4 text-right text-red-500 font-medium">
                    {formatCurrency(row.errorAmount)}
                  </td>
                  <td className="py-3 pr-4 text-right text-gray-900">
                    {formatCurrency(row.adjustedSum)}
                  </td>
                  <td className="py-3">
                    <ValidateToggle />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function DeviationTable({ title, rows }: { title: string; rows: DeviationRow[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">No items</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500">
                <th className="text-left font-medium py-3 pr-4">Bidder</th>
                <th className="text-left font-medium py-3 pr-4">Document</th>
                <th className="text-left font-medium py-3 pr-4">Status</th>
                <th className="text-left font-medium py-3 pr-4">Notes</th>
                <th className="text-left font-medium py-3">Validate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="py-3 pr-4 text-gray-900">{row.bidder}</td>
                  <td className="py-3 pr-4 text-gray-700">
                    {row.documentCode} — {row.documentName}
                  </td>
                  <td className="py-3 pr-4 text-red-500">{row.status}</td>
                  <td className="py-3 pr-4 text-gray-700">{row.notes ?? "—"}</td>
                  <td className="py-3">
                    <ValidateToggle />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function AnalysisTabs({ analysis }: { analysis: OmniDetailedAnalysis }) {
  const [tab, setTab] = useState<TabKey>("high-rates")

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-1 bg-white rounded-full p-1 border border-gray-100">
        {TABS.map((t) => {
          const selected = t.key === tab
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`text-sm font-medium py-2.5 px-3 rounded-full transition-colors ${
                selected
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === "high-rates" && (
        <RateTable
          title="High Rates Analysis"
          rows={analysis.highRates}
          variancePositive
        />
      )}
      {tab === "low-rates" && (
        <RateTable
          title="Low Rates Analysis"
          rows={analysis.lowRates}
          variancePositive={false}
        />
      )}
      {tab === "unpriced" && <UnpricedTable rows={analysis.unpriced} />}
      {tab === "arithmetical" && (
        <ArithmeticalTable rows={analysis.arithmetical} />
      )}
      {tab === "commercial-dev" && (
        <DeviationTable
          title="Commercial Deviations"
          rows={analysis.commercialDev}
        />
      )}
      {tab === "technical-dev" && (
        <DeviationTable
          title="Technical Deviations"
          rows={analysis.technicalDev}
        />
      )}
    </div>
  )
}
