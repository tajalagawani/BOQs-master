"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface CostModelEntryFilter {
  assetClass?: string;
  assetTypeL1?: string;
  assetFormL2?: string;
  pricePoint?: string;
  extraPath?: string;
}

/**
 * Add a new hierarchy entry to the cost model.
 * Creates a placeholder entry with default NRM values.
 */
export async function addCostModelEntry(entry: CostModelEntryFilter) {
  try {
    const existing = await prisma.costModelEntry.findFirst({
      where: {
        assetClass: entry.assetClass || "-",
        assetTypeL1: entry.assetTypeL1 || "-",
        assetFormL2: entry.assetFormL2 || "-",
        pricePoint: entry.pricePoint || "-",
        extraPath: entry.extraPath || "",
      },
    });

    if (existing) {
      throw new Error("Entry already exists");
    }

    await prisma.costModelEntry.create({
      data: {
        assetClass: entry.assetClass || "-",
        assetTypeL1: entry.assetTypeL1 || "-",
        assetFormL2: entry.assetFormL2 || "-",
        pricePoint: entry.pricePoint || "-",
        extraPath: entry.extraPath || "",
        nrmLvl1: "0 - Facilitating Works",
        nrmLvl2: "-",
        nrmLvl3: "-",
        rcdcCostGfa: 0,
      },
    });

    revalidatePath("/configuration");
    return { success: true };
  } catch (error) {
    console.error("Failed to add cost model entry:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Edit a hierarchy value across all matching cost model entries.
 * Updates all rows that match the old value at the given level.
 */
export async function editCostModelEntry(
  oldValue: string,
  newValue: string,
  level: string,
  context: CostModelEntryFilter
) {
  try {
    if (level === "assetClass") {
      await prisma.costModelEntry.updateMany({
        where: { assetClass: oldValue },
        data: { assetClass: newValue },
      });
    } else if (level === "assetTypeL1") {
      await prisma.costModelEntry.updateMany({
        where: { assetClass: context.assetClass, assetTypeL1: oldValue },
        data: { assetTypeL1: newValue },
      });
    } else if (level === "assetFormL2") {
      await prisma.costModelEntry.updateMany({
        where: {
          assetClass: context.assetClass,
          assetTypeL1: context.assetTypeL1,
          assetFormL2: oldValue,
        },
        data: { assetFormL2: newValue },
      });
    } else if (level === "pricePoint") {
      await prisma.costModelEntry.updateMany({
        where: {
          assetClass: context.assetClass,
          assetTypeL1: context.assetTypeL1,
          assetFormL2: context.assetFormL2,
          pricePoint: oldValue,
        },
        data: { pricePoint: newValue },
      });
    } else if (level === "extraLevel") {
      // Rename this node and all its descendants in extraPath
      const currentPath = context.extraPath || "";
      const parentPath = currentPath.includes("/")
        ? currentPath.substring(0, currentPath.lastIndexOf("/"))
        : "";
      const newPath = parentPath ? `${parentPath}/${newValue}` : newValue;

      // Update exact matches and children (paths starting with currentPath + "/")
      await prisma.$executeRaw`
        UPDATE cost_model_entries
        SET "extraPath" = REPLACE("extraPath", ${currentPath}, ${newPath})
        WHERE ("extraPath" = ${currentPath} OR "extraPath" LIKE ${currentPath + "/%"})
          AND "assetClass"  = ${context.assetClass ?? ""}
          AND "assetTypeL1" = ${context.assetTypeL1 ?? ""}
          AND "assetFormL2" = ${context.assetFormL2 ?? ""}
          AND "pricePoint"  = ${context.pricePoint ?? ""}
      `;
    }

    revalidatePath("/configuration");
    return { success: true };
  } catch (error) {
    console.error("Failed to edit cost model entry:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Delete all cost model entries matching the given hierarchy.
 */
export async function deleteCostModelEntry(entry: CostModelEntryFilter) {
  try {
    const whereClause: any = {};

    if (entry.assetClass) whereClause.assetClass = entry.assetClass;
    if (entry.assetTypeL1) whereClause.assetTypeL1 = entry.assetTypeL1;
    if (entry.assetFormL2) whereClause.assetFormL2 = entry.assetFormL2;
    if (entry.pricePoint) whereClause.pricePoint = entry.pricePoint;

    if (entry.extraPath !== undefined && entry.extraPath !== "") {
      // Delete this extra-level node and all its descendants
      await prisma.$executeRaw`
        DELETE FROM cost_model_entries
        WHERE ("extraPath" = ${entry.extraPath} OR "extraPath" LIKE ${entry.extraPath + "/%"})
          AND "assetClass"  = ${entry.assetClass ?? ""}
          AND "assetTypeL1" = ${entry.assetTypeL1 ?? ""}
          AND "assetFormL2" = ${entry.assetFormL2 ?? ""}
          AND "pricePoint"  = ${entry.pricePoint ?? ""}
      `;
    } else {
      await prisma.costModelEntry.deleteMany({ where: whereClause });
    }

    revalidatePath("/configuration");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete cost model entry:", error);
    return { success: false, error: String(error) };
  }
}
