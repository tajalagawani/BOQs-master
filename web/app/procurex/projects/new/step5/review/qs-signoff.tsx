"use client"

import { useState } from "react"
import { Check } from "lucide-react"

/**
 * QS sign-off card. The acknowledgement checkbox lives in local state
 * (no `qs_signoff` table yet → toggle is per-tab). The signed-by
 * footer renders the reviewer's name + date only when passed; without
 * them it shows "Not implemented" so we never lie about who signed.
 */
export function QsSignoff({
  reviewerName,
  signedAt,
}: {
  reviewerName?: string | null
  signedAt?: string | null
} = {}) {
  const [accepted, setAccepted] = useState(false)
  const hasSignoff = Boolean(reviewerName && signedAt)

  return (
    <div className="bg-white border border-[#e9e9e9] flex flex-col gap-[16px] p-[24px] rounded-[16px]">
      <h4 className="font-semibold text-[#141414] text-[14px] leading-[20px]">
        QS Review
      </h4>
      <button
        type="button"
        onClick={() => setAccepted((v) => !v)}
        className="flex items-start gap-[12px]"
      >
        <span
          className={`size-[20px] rounded-[6px] flex items-center justify-center shrink-0 mt-[2px] ${
            accepted
              ? "bg-[#141414] border border-[#141414]"
              : "bg-white border border-[#c4c4c4]"
          }`}
        >
          {accepted && <Check className="size-[12px] text-white" strokeWidth={3} />}
        </span>
        <span className="font-medium text-[#141414] text-[14px] leading-[20px] text-left">
          I&rsquo;ve read and accepted all responses in PTC
        </span>
      </button>
      <div className="flex items-center gap-[8px] pt-[4px]">
        {hasSignoff ? (
          <p className="font-normal text-[#555] text-[12px] leading-[16px]">
            {reviewerName} · {signedAt}
          </p>
        ) : (
          <span
            className="inline-flex items-center px-[8px] py-[2px] rounded-[8px] border border-dashed border-[#94a3b8] bg-[#f8fafc] text-[#475569] text-[11px] font-medium uppercase tracking-wider"
            title="No `qs_signoff` table yet — reviewer + signed date not stored"
          >
            Signed-by — Not implemented
          </span>
        )}
      </div>
    </div>
  )
}
