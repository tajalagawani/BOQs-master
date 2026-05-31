"use client"

import { createContext, useContext } from "react"

export type PtcRoundStatus = "draft" | "issued" | "response-received"

export interface LockState {
  currentRoundStatus: PtcRoundStatus
  issuedAt: string | null
  /** When true, interactive controls become read-only (greyed). */
  readOnly: boolean
}

const LockContext = createContext<LockState>({
  currentRoundStatus: "draft",
  issuedAt: null,
  readOnly: false,
})

export function LockProvider({
  value,
  children,
}: {
  value: LockState
  children: React.ReactNode
}) {
  return <LockContext.Provider value={value}>{children}</LockContext.Provider>
}

export function useLockState(): LockState {
  return useContext(LockContext)
}
