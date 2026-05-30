"use server";

/**
 * Masterplan server actions — ported verbatim from
 * roshn/src/actions/masterplans.ts.
 *
 * Differences from the original:
 *   • `getCurrentUserServer()` → `getSession()` (mock Arjun)
 *   • `revalidatePath("/masterplan-estimates")` → `/costx`
 *   • Otherwise identical: same permission checks, same
 *     phase/team-member handling, same activity logging.
 */
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import {
  getUserPermissions,
  canCreateMasterplanForProject,
  canAccessMasterplan,
} from "@/lib/permissions";
import { MasterplanStatus } from "@prisma/client";

/**
 * Create a new masterplan
 */
export async function createMasterplan(formData: FormData) {
  try {
    const { user: currentUser } = await getSession();

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const grossLandArea = Number(formData.get("grossLandArea"));
    const calculatedPlotArea = Number(formData.get("calculatedPlotArea"));
    const balanceExternalArea = Number(formData.get("balanceExternalArea"));
    const totalUnits = Number(formData.get("totalUnits"));
    const parkingSpaces = Number(formData.get("parkingSpaces"));
    const contingency = Number(formData.get("contingency"));
    const totalCost = Number(formData.get("totalCost"));
    const costPerGfa = Number(formData.get("costPerGfa"));
    const assetClass = formData.get("assetClass") as string;
    const assetTypeL1 = formData.get("assetTypeL1") as string;
    const assetFormL2 = formData.get("assetFormL2") as string | null;
    const status =
      (formData.get("status") as MasterplanStatus) || MasterplanStatus.DRAFT;
    const benchmarkProjectId = formData.get("benchmarkProjectId") as string | null;
    const memberIds = formData.get("memberIds") as string | null;
    const parsedMemberIds = memberIds ? (JSON.parse(memberIds) as string[]) : [];
    const numberOfPhases = Number(formData.get("numberOfPhases")) || 1;
    const phasesJson = formData.get("phases") as string | null;
    const parsedPhases = phasesJson
      ? (JSON.parse(phasesJson) as Array<{
          phaseNumber: number;
          phaseName: string;
          startDate: string;
          totalMonths: number;
        }>)
      : [];

    // Check permissions
    const permissions = await getUserPermissions(currentUser.id);
    if (!permissions.canCreateMasterplan) {
      return {
        success: false,
        error: "You don't have permission to create masterplans",
      };
    }

    if (benchmarkProjectId) {
      const canCreate = await canCreateMasterplanForProject(
        currentUser.id,
        benchmarkProjectId,
      );
      if (!canCreate) {
        return {
          success: false,
          error:
            "You don't have permission to create masterplans for this project",
        };
      }
    }

    const masterplan = await prisma.masterplan.create({
      data: {
        name,
        description: description || null,
        grossLandArea,
        calculatedPlotArea,
        balanceExternalArea,
        totalUnits,
        parkingSpaces,
        contingency,
        totalCost,
        costPerGfa,
        assetClass,
        assetTypeL1,
        assetFormL2,
        status,
        createdById: currentUser.id,
        benchmarkProjectId: benchmarkProjectId || null,
        numberOfPhases,
        teamMembers:
          parsedMemberIds.length > 0
            ? {
                create: parsedMemberIds.map((userId) => ({
                  userId,
                  assignedBy: currentUser.id,
                })),
              }
            : undefined,
      },
    });

    if (parsedPhases.length > 0) {
      await prisma.masterplanPhase.createMany({
        data: parsedPhases.map((phase) => ({
          masterplanId: masterplan.id,
          phaseNumber: phase.phaseNumber,
          phaseName: phase.phaseName,
          startDate: phase.startDate,
          totalMonths: phase.totalMonths,
        })),
      });
    }

    const masterplanForLog = {
      ...masterplan,
      grossLandArea: Number(masterplan.grossLandArea),
      calculatedPlotArea: Number(masterplan.calculatedPlotArea),
      balanceExternalArea: Number(masterplan.balanceExternalArea),
      contingency: Number(masterplan.contingency),
      totalCost: Number(masterplan.totalCost),
      costPerGfa: Number(masterplan.costPerGfa),
    };
    await logActivity(
      currentUser.id,
      "created",
      "masterplan",
      masterplan.id,
      null,
      masterplanForLog,
    );

    revalidatePath("/costx");
    revalidatePath("/");

    return { success: true, id: masterplan.id };
  } catch (error) {
    console.error("Error creating masterplan:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create masterplan";
    return { success: false, error: errorMessage };
  }
}

/**
 * Update an existing masterplan
 */
export async function updateMasterplan(
  id: string,
  data: {
    name?: string;
    description?: string;
    grossLandArea?: number;
    calculatedPlotArea?: number;
    balanceExternalArea?: number;
    totalUnits?: number;
    parkingSpaces?: number;
    contingency?: number;
    totalCost?: number;
    costPerGfa?: number;
    assetClass?: string;
    assetTypeL1?: string;
    assetFormL2?: string;
    status?: MasterplanStatus;
    memberIds?: string[];
    benchmarkProjectId?: string | null;
    numberOfPhases?: number;
    phases?: Array<{
      phaseNumber: number;
      phaseName: string;
      startDate: string;
      totalMonths: number;
    }>;
  },
) {
  try {
    const { user: currentUser } = await getSession();

    const canUpdate = await canAccessMasterplan(currentUser.id, id);
    if (!canUpdate) {
      return {
        success: false,
        error: "You don't have permission to update this masterplan",
      };
    }

    const existing = await prisma.masterplan.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Masterplan not found" };
    }

    if (data.memberIds !== undefined) {
      await prisma.projectTeamMember.deleteMany({ where: { masterplanId: id } });
      if (data.memberIds.length > 0) {
        await prisma.projectTeamMember.createMany({
          data: data.memberIds.map((userId) => ({
            masterplanId: id,
            userId,
            assignedBy: currentUser.id,
          })),
        });
      }
    }

    const { memberIds: _members, phases, ...updateData } = data;
    void _members;

    const updated = await prisma.masterplan.update({
      where: { id },
      data: updateData,
    });

    if (phases && phases.length > 0) {
      await prisma.masterplanPhase.deleteMany({ where: { masterplanId: id } });
      await prisma.masterplanPhase.createMany({
        data: phases.map((phase) => ({
          masterplanId: id,
          phaseNumber: phase.phaseNumber,
          phaseName: phase.phaseName,
          startDate: phase.startDate,
          totalMonths: phase.totalMonths,
        })),
      });
    }

    const existingForLog = {
      ...existing,
      grossLandArea: Number(existing.grossLandArea),
      calculatedPlotArea: Number(existing.calculatedPlotArea),
      balanceExternalArea: Number(existing.balanceExternalArea),
      contingency: Number(existing.contingency),
      totalCost: Number(existing.totalCost),
      costPerGfa: Number(existing.costPerGfa),
    };
    const updatedForLog = {
      ...updated,
      grossLandArea: Number(updated.grossLandArea),
      calculatedPlotArea: Number(updated.calculatedPlotArea),
      balanceExternalArea: Number(updated.balanceExternalArea),
      contingency: Number(updated.contingency),
      totalCost: Number(updated.totalCost),
      costPerGfa: Number(updated.costPerGfa),
    };
    await logActivity(
      currentUser.id,
      "updated",
      "masterplan",
      id,
      existingForLog,
      updatedForLog,
    );

    revalidatePath("/costx");
    revalidatePath(`/costx/${id}`);
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error updating masterplan:", error);
    return { success: false, error: "Failed to update masterplan" };
  }
}

/**
 * Delete a masterplan (admin only)
 */
export async function deleteMasterplan(id: string) {
  try {
    const { user: currentUser } = await getSession();

    const permissions = await getUserPermissions(currentUser.id);
    if (!permissions.isAdmin) {
      return { success: false, error: "Only admins can delete masterplans" };
    }

    const existing = await prisma.masterplan.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Masterplan not found" };
    }

    // Cascade
    await prisma.buildingCost.deleteMany({ where: { masterplanId: id } });
    await prisma.infrastructureCost.deleteMany({ where: { masterplanId: id } });
    await prisma.projectTeamMember.deleteMany({ where: { masterplanId: id } });
    await prisma.masterplanPhase.deleteMany({ where: { masterplanId: id } });
    await prisma.masterplan.delete({ where: { id } });

    const existingForLog = {
      ...existing,
      grossLandArea: Number(existing.grossLandArea),
      calculatedPlotArea: Number(existing.calculatedPlotArea),
      balanceExternalArea: Number(existing.balanceExternalArea),
      contingency: Number(existing.contingency),
      totalCost: Number(existing.totalCost),
      costPerGfa: Number(existing.costPerGfa),
    };
    await logActivity(
      currentUser.id,
      "deleted",
      "masterplan",
      id,
      existingForLog,
      null,
    );

    revalidatePath("/costx");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error deleting masterplan:", error);
    return { success: false, error: "Failed to delete masterplan" };
  }
}
