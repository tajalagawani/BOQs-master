"use server"

import { and, eq, isNull } from "drizzle-orm"

import { recordAudit } from "@/modules/audit"
import {
  analysisConfigs,
  type BaselineKind,
  type UnpricedStrategy,
} from "@/modules/analysis/schema"
import { requireUserId } from "@/modules/core/auth"
import { db } from "@/modules/core/db"
import { documents } from "@/modules/documents/schema"
import { roundConfigRefs } from "@/modules/procurex/config/schema"
import { projects } from "@/modules/procurex/projects/schema"
import { revisions, rounds } from "@/modules/procurex/revisions/schema"
import { workspaceMembers } from "@/modules/workspace/schema"

// ────────────────────────────────────────────────────────────────────────
// Types — what the UI sends and reads back
// ────────────────────────────────────────────────────────────────────────

export interface Step4Config {
  baselineKind: BaselineKind
  referencePricesetId: string | null
  highThresholdEnabled: boolean
  highThresholdPct: string
  lowThresholdEnabled: boolean
  lowThresholdPct: string
  unpricedStrategy: UnpricedStrategy
  unpricedQualityCheckEnabled: boolean
  unpricedQualityCheckPct: string
  sectionsEnabled: Record<string, boolean>
}

export interface Step4ConfigBundle {
  /** Round id resolved from `(projectId, 'initial')` — created if absent. */
  roundId: string
  ptc: Step4Config
  tender: Step4Config
  /** True iff a `scope='pte'` document exists for this project (no soft-delete). */
  pteAvailable: boolean
  /** True once the round has been signed off (locks the configs). */
  isLocked: boolean
  /** Most recent updated_at across both configs — null when nothing saved yet. */
  lastSavedAt: Date | null
}

export type SaveStep4Result =
  | { ok: true; lastSavedAt: Date }
  | { ok: false; error: string; field?: string }

// ────────────────────────────────────────────────────────────────────────
// Defaults — see docs/STEP4_PLAN.md §2
// ────────────────────────────────────────────────────────────────────────

function defaultPtc(pteAvailable: boolean): Step4Config {
  void pteAvailable
  return {
    baselineKind: "avg_lowest_three",
    referencePricesetId: null,
    highThresholdEnabled: true,
    highThresholdPct: "15",
    lowThresholdEnabled: false,
    lowThresholdPct: "-15",
    unpricedStrategy: "list_only",
    unpricedQualityCheckEnabled: false,
    unpricedQualityCheckPct: "20",
    sectionsEnabled: {
      highRateAppendix: true,
      lowRateAppendix: false,
      unpricedItems: true,
      excluded: true,
      completionChecker: true,
    },
  }
}

function defaultTender(pteAvailable: boolean): Step4Config {
  // Falls back to avg_lowest_three when there's no PTE so the save
  // doesn't fail-loud on a fresh project. UI banner makes the fallback
  // visible to the QS.
  return {
    baselineKind: pteAvailable ? "reference" : "avg_lowest_three",
    referencePricesetId: null,
    highThresholdEnabled: true,
    highThresholdPct: "15",
    lowThresholdEnabled: true,
    lowThresholdPct: "-15",
    unpricedStrategy: "list_only",
    unpricedQualityCheckEnabled: true,
    unpricedQualityCheckPct: "20",
    sectionsEnabled: {
      highRateAppendix: true,
      lowRateAppendix: true,
      unpricedItems: true,
      normalisedTotals: false,
      arithmeticalAdjustments: true,
      rankingTable: true,
      qsSignOffRequired: true,
    },
  }
}

// ────────────────────────────────────────────────────────────────────────
// READ — getStep4Config
// ────────────────────────────────────────────────────────────────────────

export async function getStep4Config(
  projectId: string,
): Promise<Step4ConfigBundle> {
  const userId = await requireUserId()
  if (!projectId) throw new Error("projectId required")
  const project = await assertProjectMember(projectId, userId)

  // 1. Resolve-or-create the initial round.
  const round = await resolveOrCreateInitialRound(projectId)

  // 2. PTE availability gate.
  const [pte] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(
        eq(documents.projectId, projectId),
        eq(documents.scope, "pte"),
        isNull(documents.deletedAt),
      ),
    )
    .limit(1)
  const pteAvailable = Boolean(pte)

  // 3. Load existing analysis_config rows for this round, by context.
  const existing = await db
    .select()
    .from(analysisConfigs)
    .where(
      and(
        eq(analysisConfigs.ownerKind, "round"),
        eq(analysisConfigs.ownerId, round.id),
      ),
    )
  const byContext = new Map(existing.map((r) => [r.context, r]))

  const ptc = byContext.get("ptc")
    ? rowToConfig(byContext.get("ptc")!)
    : defaultPtc(pteAvailable)
  const tender = byContext.get("tender")
    ? rowToConfig(byContext.get("tender")!)
    : defaultTender(pteAvailable)

  const lastSavedAt = existing.length
    ? new Date(
        Math.max(...existing.map((r) => new Date(r.updatedAt).getTime())),
      )
    : null

  void project

  return {
    roundId: round.id,
    ptc,
    tender,
    pteAvailable,
    isLocked: Boolean(round.signedOffAt),
    lastSavedAt,
  }
}

// ────────────────────────────────────────────────────────────────────────
// WRITE — saveStep4Config
// ────────────────────────────────────────────────────────────────────────

export async function saveStep4Config(args: {
  projectId: string
  ptc: Step4Config
  tender: Step4Config
}): Promise<SaveStep4Result> {
  const userId = await requireUserId()
  await assertProjectMember(args.projectId, userId)

  // Validate both shapes server-side.
  const v1 = validate(args.ptc, "ptc")
  if (!v1.ok) return v1
  const v2 = validate(args.tender, "tender")
  if (!v2.ok) return v2

  // Resolve round + PTE availability (defence in depth).
  const round = await resolveOrCreateInitialRound(args.projectId)
  if (round.signedOffAt) {
    return { ok: false, error: "Round is locked. Unlock before editing." }
  }
  const [pte] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(
        eq(documents.projectId, args.projectId),
        eq(documents.scope, "pte"),
        isNull(documents.deletedAt),
      ),
    )
    .limit(1)
  const pteAvailable = Boolean(pte)
  if (args.ptc.baselineKind === "reference" && !pteAvailable) {
    return {
      ok: false,
      error: "Upload a PTE before choosing the Pre-Tender Estimate baseline (PTC).",
      field: "ptc.baselineKind",
    }
  }
  if (args.tender.baselineKind === "reference" && !pteAvailable) {
    return {
      ok: false,
      error: "Upload a PTE before choosing the Pre-Tender Estimate baseline (Tender).",
      field: "tender.baselineKind",
    }
  }

  const [{ workspaceId }] = await db
    .select({ workspaceId: projects.workspaceId })
    .from(projects)
    .where(eq(projects.id, args.projectId))

  // UPSERT both configs (UPDATE-or-INSERT pattern).
  const savedAt = new Date()
  for (const ctx of ["ptc", "tender"] as const) {
    const cfg = ctx === "ptc" ? args.ptc : args.tender
    const existing = await db
      .select({ id: analysisConfigs.id })
      .from(analysisConfigs)
      .where(
        and(
          eq(analysisConfigs.ownerKind, "round"),
          eq(analysisConfigs.ownerId, round.id),
          eq(analysisConfigs.context, ctx),
        ),
      )
      .limit(1)

    const values = {
      ownerKind: "round" as const,
      ownerId: round.id,
      context: ctx,
      baselineKind: cfg.baselineKind,
      referencePricesetId: cfg.referencePricesetId,
      highThresholdEnabled: cfg.highThresholdEnabled,
      highThresholdPct: cfg.highThresholdPct,
      lowThresholdEnabled: cfg.lowThresholdEnabled,
      lowThresholdPct: cfg.lowThresholdPct,
      unpricedStrategy: cfg.unpricedStrategy,
      unpricedQualityCheckEnabled: cfg.unpricedQualityCheckEnabled,
      unpricedQualityCheckPct: cfg.unpricedQualityCheckPct,
      sectionsEnabled: cfg.sectionsEnabled,
      updatedByUserId: userId,
      updatedAt: savedAt,
    }

    let configId: string
    if (existing[0]) {
      configId = existing[0].id
      await db
        .update(analysisConfigs)
        .set(values)
        .where(eq(analysisConfigs.id, configId))
    } else {
      const [row] = await db
        .insert(analysisConfigs)
        .values(values)
        .returning({ id: analysisConfigs.id })
      configId = row!.id
    }

    // Keep the round_config_ref index in sync.
    const existingRef = await db
      .select({ id: roundConfigRefs.id })
      .from(roundConfigRefs)
      .where(
        and(
          eq(roundConfigRefs.roundId, round.id),
          eq(roundConfigRefs.context, ctx),
        ),
      )
      .limit(1)
    if (existingRef[0]) {
      await db
        .update(roundConfigRefs)
        .set({ configId })
        .where(eq(roundConfigRefs.id, existingRef[0].id))
    } else {
      await db
        .insert(roundConfigRefs)
        .values({ roundId: round.id, context: ctx, configId })
    }
  }

  await recordAudit({
    workspaceId,
    projectId: args.projectId,
    actorUserId: userId,
    actorKind: "user",
    action: "config.save:step4",
    targetKind: "round",
    targetId: round.id,
    payload: {
      ptcBaseline: args.ptc.baselineKind,
      tenderBaseline: args.tender.baselineKind,
      ptcUnpriced: args.ptc.unpricedStrategy,
      tenderUnpriced: args.tender.unpricedStrategy,
    },
  })

  return { ok: true, lastSavedAt: savedAt }
}

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

async function resolveOrCreateInitialRound(projectId: string) {
  // Round is `(revision_id, key)`; revision sits between project and round.
  const existing = await db
    .select({
      id: rounds.id,
      signedOffAt: rounds.signedOffAt,
    })
    .from(rounds)
    .innerJoin(revisions, eq(revisions.id, rounds.revisionId))
    .where(and(eq(revisions.projectId, projectId), eq(rounds.key, "initial")))
    .limit(1)
  if (existing[0]) return existing[0]

  // None yet — create revision 0 + initial round.
  const [rev] = await db
    .insert(revisions)
    .values({ projectId, label: "Revision 0 — Initial Submission", position: 0 })
    .returning({ id: revisions.id })
  const [round] = await db
    .insert(rounds)
    .values({ revisionId: rev!.id, key: "initial", label: "Initial", status: "open" })
    .returning({ id: rounds.id, signedOffAt: rounds.signedOffAt })
  return round!
}

async function assertProjectMember(projectId: string, userId: string) {
  const [project] = await db
    .select({ id: projects.id, workspaceId: projects.workspaceId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  if (!project) throw new Error("Project not found")
  const [member] = await db
    .select({ id: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, project.workspaceId),
      ),
    )
    .limit(1)
  if (!member) throw new Error("FORBIDDEN")
  return project
}

function rowToConfig(
  r: typeof analysisConfigs.$inferSelect,
): Step4Config {
  return {
    baselineKind: r.baselineKind,
    referencePricesetId: r.referencePricesetId,
    highThresholdEnabled: r.highThresholdEnabled,
    highThresholdPct: r.highThresholdPct ?? "15",
    lowThresholdEnabled: r.lowThresholdEnabled,
    lowThresholdPct: r.lowThresholdPct ?? "-15",
    unpricedStrategy: r.unpricedStrategy ?? "list_only",
    unpricedQualityCheckEnabled: r.unpricedQualityCheckEnabled,
    unpricedQualityCheckPct: r.unpricedQualityCheckPct ?? "20",
    sectionsEnabled:
      (r.sectionsEnabled as Record<string, boolean> | null) ?? {},
  }
}

function validate(
  cfg: Step4Config,
  context: "ptc" | "tender",
): { ok: true } | { ok: false; error: string; field?: string } {
  // Threshold ranges per §7 — 0 < high ≤ 100, -100 ≤ low < 0.
  const high = Number(cfg.highThresholdPct)
  if (cfg.highThresholdEnabled && (!Number.isFinite(high) || high <= 0 || high > 100)) {
    return {
      ok: false,
      error: `High threshold must be a number between 0 and 100 (got ${cfg.highThresholdPct}).`,
      field: `${context}.highThresholdPct`,
    }
  }
  const low = Number(cfg.lowThresholdPct)
  if (cfg.lowThresholdEnabled && (!Number.isFinite(low) || low >= 0 || low < -100)) {
    return {
      ok: false,
      error: `Low threshold must be a negative number between -100 and 0 (got ${cfg.lowThresholdPct}).`,
      field: `${context}.lowThresholdPct`,
    }
  }
  const qc = Number(cfg.unpricedQualityCheckPct)
  if (
    cfg.unpricedQualityCheckEnabled &&
    (!Number.isFinite(qc) || qc <= 0 || qc > 100)
  ) {
    return {
      ok: false,
      error: `Quality-check % must be between 0 and 100 (got ${cfg.unpricedQualityCheckPct}).`,
      field: `${context}.unpricedQualityCheckPct`,
    }
  }
  return { ok: true }
}
