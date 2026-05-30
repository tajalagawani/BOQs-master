"use server";

/**
 * Masterplan version actions — ported verbatim from
 * roshn/src/actions/masterplan.ts.
 *
 * Auto-save stores the in-progress version JSON under a Configuration
 * row keyed `masterplan_version_<masterplanId>_<versionId>`. Load
 * reads it back. Identical to roshn behaviour.
 */
import { prisma } from "@/lib/prisma";
import type { MasterplanVersion } from "@/types/masterplan";

export async function autoSaveMasterplanVersion(
  masterplanId: string,
  versionData: MasterplanVersion,
) {
  try {
    const configKey = `masterplan_version_${masterplanId}_${versionData.id}`;

    const existing = await prisma.configuration.findUnique({
      where: { key: configKey },
    });

    if (existing) {
      await prisma.configuration.update({
        where: { key: configKey },
        data: {
          value: versionData as unknown as object,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.configuration.create({
        data: {
          key: configKey,
          value: versionData as unknown as object,
        },
      });
    }

    await prisma.masterplan.update({
      where: { id: masterplanId },
      data: { updatedAt: new Date() },
    });

    return { success: true, savedAt: new Date().toISOString() };
  } catch (error) {
    console.error("Error auto-saving masterplan version:", error);
    return { success: false, error: "Failed to auto-save" };
  }
}

export async function loadMasterplanVersion(
  masterplanId: string,
  versionId: string,
): Promise<MasterplanVersion | null> {
  try {
    const configKey = `masterplan_version_${masterplanId}_${versionId}`;
    const config = await prisma.configuration.findUnique({
      where: { key: configKey },
    });
    if (!config) return null;
    return config.value as unknown as MasterplanVersion;
  } catch (error) {
    console.error("Error loading masterplan version:", error);
    return null;
  }
}
