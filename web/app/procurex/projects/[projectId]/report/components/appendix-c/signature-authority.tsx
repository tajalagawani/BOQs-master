"use client"

import { SuiteChip, CodeBadge, SubTitle, DataTable } from "@/components/suite"
import type { AppendixCData } from "@/modules/procurex/report/appendix-c-data"

/**
 * Appendix C — SIGNATURE AUTHORITY.
 *
 * Matrix: one row per tenderer with their execution-block details:
 *   - Execution date
 *   - Signatory name + capacity
 *   - "Duly authorised for" (party)
 *   - Witness name + occupation
 *   - Signature image present? (Yes/No pill)
 *
 * Sources from `byBidder[id].bidderFotSubmission.signatures` (the
 * `signatures` group of `FotGrouped`). For bidders with multiple
 * signature blocks we render the first one and note "+N more" beside
 * the name.
 */
export function SignatureAuthorityBlock({
  id,
  appendixC,
}: {
  id: string
  appendixC: AppendixCData | null
}) {
  const tenderers = appendixC?.tenderers ?? []

  return (
    <section id={id} className="scroll-mt-[24px] print:break-inside-avoid">
      <SubTitle count={`${tenderers.length} ${tenderers.length === 1 ? "tenderer" : "tenderers"}`}>
        Signature authority
      </SubTitle>
      <p className="mb-2 max-w-[78ch] text-[11.5px] leading-[1.6] text-suite-ink-3">
        Execution-block details for each tenderer&apos;s Form of Tender —
        signatory name, capacity, witness, and whether a signature image
        was captured.
      </p>

      {tenderers.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-suite-line-2 px-4 py-6 text-center text-[12px] text-suite-ink-4">
          No tenderers on this project yet.
        </div>
      ) : (
        <DataTable
          minWidth={900}
          className="max-h-[520px] overflow-auto print:max-h-none print:overflow-visible"
        >
          <thead>
            <tr>
              <th>Tenderer</th>
              <th className="r">Execution date</th>
              <th>Signatory</th>
              <th>Capacity</th>
              <th>Duly authorised for</th>
              <th>Witness</th>
              <th className="c">Signature on file</th>
            </tr>
          </thead>
          <tbody>
            {tenderers.map((bidder) => {
              const payload = appendixC?.byBidder[bidder.id]
              const sig = payload?.bidderFotSubmission?.signatures
              const blocks = sig?.blocks ?? []
              const first = blocks[0] ?? null
              const more = blocks.length > 1 ? blocks.length - 1 : 0
              return (
                <tr key={bidder.id} className="align-top">
                  <td>
                    <div className="flex items-center gap-2.5">
                      <CodeBadge>{bidder.code}</CodeBadge>
                      <span className="font-semibold text-suite-ink">
                        {bidder.name}
                      </span>
                    </div>
                  </td>
                  <td className="r">
                    <span className="suite-num">
                      <Cell value={sig?.executionDate ?? null} />
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-col gap-[2px]">
                      <Cell value={first?.name ?? null} />
                      {more > 0 && (
                        <span className="text-[10px] text-suite-ink-4">
                          +{more} more block{more === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <Cell value={first?.inTheCapacityOf ?? null} />
                  </td>
                  <td>
                    <Cell value={first?.dulyAuthorisedFor ?? null} />
                  </td>
                  <td>
                    <div className="flex flex-col gap-[2px]">
                      <Cell value={first?.witnessName ?? null} />
                      {first?.witnessOccupation && (
                        <span className="text-[10px] text-suite-ink-4">
                          {first.witnessOccupation}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="c">
                    <SignaturePill
                      present={(first?.signatureImageUrl ?? null) !== null}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </DataTable>
      )}
    </section>
  )
}

function Cell({ value }: { value: string | null }) {
  if (!value) return <span className="text-suite-ink-4">—</span>
  return <span className="text-suite-ink">{value}</span>
}

function SignaturePill({ present }: { present: boolean }) {
  if (present) {
    return <SuiteChip tone="good">On file</SuiteChip>
  }
  return <SuiteChip tone="neut">Missing</SuiteChip>
}
