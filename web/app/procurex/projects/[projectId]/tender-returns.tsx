"use client"

import { useState } from "react"
import type { OmniBidderRow } from "@/lib/procurex/data/omni-data"

interface Round {
  key: string
  label: string
  rows: OmniBidderRow[]
}

const formatCurrency = (n: number) =>
  `$${Math.round(n).toLocaleString("en-US")}`

export function TenderReturns({ rounds }: { rounds: Round[] }) {
  const [activeKey, setActiveKey] = useState(rounds[0]?.key ?? "initial")
  const active = rounds.find((r) => r.key === activeKey) ?? rounds[0]

  return (
    <div>
      <div className="inline-flex items-center gap-1 rounded-lg bg-suite-card-soft p-1 mb-4">
        {rounds.map((r) => {
          const selected = r.key === activeKey
          return (
            <button
              key={r.key}
              onClick={() => setActiveKey(r.key)}
              className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                selected
                  ? "bg-white text-suite-ink shadow-sm"
                  : "text-suite-ink-2 hover:text-suite-ink"
              }`}
            >
              {r.label}
            </button>
          )
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-suite-line">
        <table className="w-full text-sm">
          <thead className="bg-suite-card-soft text-suite-ink-3">
            <tr>
              <th className="text-left font-medium px-4 py-3">Bidder</th>
              <th className="text-right font-medium px-4 py-3">Total Bid</th>
              <th className="text-right font-medium px-4 py-3">Items Priced</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-suite-line-soft">
            {!active || active.rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-suite-ink-4">
                  No submissions for this round
                </td>
              </tr>
            ) : (
              active.rows.map((row) => (
                <tr key={row.tendererId}>
                  <td className="px-4 py-3 text-suite-ink">{row.companyName}</td>
                  <td className="px-4 py-3 text-right font-medium text-suite-ink suite-num">
                    {formatCurrency(row.totalBid)}
                  </td>
                  <td className="px-4 py-3 text-right text-suite-ink-2 suite-num">
                    {row.itemsPriced}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
