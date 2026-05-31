"use client"

import { ChevronsUpDown, PenLine } from "lucide-react"

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
    <section
      id={id}
      className="flex flex-col gap-[20px] scroll-mt-[24px] print:break-inside-avoid"
    >
      <div className="flex flex-col gap-[6px]">
        <div className="flex gap-[12px] items-center w-full">
          <span className="bg-[rgba(226,237,247,0.5)] flex items-center justify-center rounded-[10px] size-[40px] shrink-0">
            <PenLine className="size-[16px] text-[#142845]" />
          </span>
          <h3 className="font-semibold text-[#142845] text-[18px] leading-[24px] flex-1 min-w-0">
            Signature Authority
          </h3>
        </div>
        <p className="text-[#555] text-[12px] leading-[16px] font-light pl-[52px]">
          Execution-block details for each tenderer&apos;s Form of Tender —
          signatory name, capacity, witness, and whether a signature image
          was captured.
        </p>
      </div>

      {tenderers.length === 0 ? (
        <div className="border border-dashed border-[#e2edf7] rounded-[12px] py-[24px] text-center text-[12px] text-[#888]">
          No tenderers on this project yet.
        </div>
      ) : (
        <div className="border border-[#e2edf7] rounded-[12px] overflow-auto bg-white max-h-[520px] print:max-h-none print:overflow-visible">
          <table className="w-full text-[12px] border-collapse">
            <thead className="sticky top-0 z-20 bg-[rgba(226,237,247,0.95)] backdrop-blur-sm print:static">
              <tr className="bg-[rgba(226,237,247,0.5)]">
                <Th sticky>Tenderer</Th>
                <Th>Execution date</Th>
                <Th>Signatory</Th>
                <Th>Capacity</Th>
                <Th>Duly authorised for</Th>
                <Th>Witness</Th>
                <Th>Signature on file</Th>
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
                  <tr key={bidder.id} className="border-t border-[#f0f5fa]">
                    <Td sticky>
                      <div className="flex items-center gap-[8px]">
                        <span className="font-mono text-[10px] text-[#888]">
                          {bidder.code}
                        </span>
                        <span className="text-[#142845] text-[13px] font-medium truncate">
                          {bidder.name}
                        </span>
                      </div>
                    </Td>
                    <Td>
                      <Cell value={sig?.executionDate ?? null} />
                    </Td>
                    <Td>
                      <div className="flex flex-col gap-[2px]">
                        <Cell value={first?.name ?? null} />
                        {more > 0 && (
                          <span className="text-[10px] text-[#888]">
                            +{more} more block{more === 1 ? "" : "s"}
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <Cell value={first?.inTheCapacityOf ?? null} />
                    </Td>
                    <Td>
                      <Cell value={first?.dulyAuthorisedFor ?? null} />
                    </Td>
                    <Td>
                      <div className="flex flex-col gap-[2px]">
                        <Cell value={first?.witnessName ?? null} />
                        {first?.witnessOccupation && (
                          <span className="text-[10px] text-[#888]">
                            {first.witnessOccupation}
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <SignaturePill
                        present={
                          (first?.signatureImageUrl ?? null) !== null
                        }
                      />
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function Cell({ value }: { value: string | null }) {
  if (!value) return <span className="text-[#888] text-[12px]">—</span>
  return (
    <span className="text-[#142845] text-[12px] leading-[16px]">{value}</span>
  )
}

function SignaturePill({ present }: { present: boolean }) {
  if (present) {
    return (
      <span className="inline-flex items-center gap-[4px] bg-[#e8f5e9] text-[#1b5e20] text-[11px] leading-[16px] font-medium px-[8px] py-[2px] rounded-[8px]">
        <span className="size-[6px] rounded-full bg-[#1b5e20]" />
        On file
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-[4px] bg-[#f5f5f5] text-[#666] text-[11px] leading-[16px] font-medium px-[8px] py-[2px] rounded-[8px]">
      <span className="size-[6px] rounded-full bg-[#888]" />
      Missing
    </span>
  )
}

function Th({
  children,
  sticky = false,
}: {
  children: React.ReactNode
  sticky?: boolean
}) {
  return (
    <th
      className={`py-[10px] px-[12px] text-[#434343] text-[11px] leading-[16px] font-semibold uppercase tracking-wider text-left ${
        sticky ? "sticky left-0 bg-[rgba(226,237,247,0.5)] z-10" : ""
      }`}
    >
      <span className="inline-flex items-center gap-[4px]">
        {children}
        <ChevronsUpDown className="size-[10px] text-[#9aa1ac]" />
      </span>
    </th>
  )
}

function Td({
  children,
  sticky = false,
  className = "",
}: {
  children: React.ReactNode
  sticky?: boolean
  className?: string
}) {
  return (
    <td
      className={`py-[10px] px-[12px] align-top ${
        sticky ? "sticky left-0 bg-white z-10" : ""
      } ${className}`}
    >
      {children}
    </td>
  )
}
