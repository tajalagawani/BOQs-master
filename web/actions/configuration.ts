"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/auth";

/**
 * Update cost model entries
 */
export async function updateCostModel(
  entries: Array<{
    id?: string;
    assetClass: string;
    assetTypeL1: string;
    assetFormL2: string | null;
    pricePoint: string | null;
    nrmLvl1: string;
    nrmLvl2: string | null;
    nrmLvl3: string | null;
    unitOfMeasurement: string;
    sarPerUoM: number;
  }>
) {
  try {
    // Update or create cost model entries
    for (const entry of entries) {
      if (entry.id) {
        // Update existing entry
        await prisma.costModelEntry.update({
          where: { id: entry.id },
          data: {
            assetClass: entry.assetClass,
            assetTypeL1: entry.assetTypeL1,
            assetFormL2: entry.assetFormL2,
            pricePoint: entry.pricePoint,
            nrmLvl1: entry.nrmLvl1,
            nrmLvl2: entry.nrmLvl2,
            nrmLvl3: entry.nrmLvl3,
            unitOfMeasurement: entry.unitOfMeasurement,
            sarPerUoM: entry.sarPerUoM,
            rcdcCostGfa: entry.sarPerUoM, // Same as sarPerUoM for now
          },
        });
      } else {
        // Create new entry
        await prisma.costModelEntry.create({
          data: {
            assetClass: entry.assetClass,
            assetTypeL1: entry.assetTypeL1,
            assetFormL2: entry.assetFormL2,
            pricePoint: entry.pricePoint,
            nrmLvl1: entry.nrmLvl1,
            nrmLvl2: entry.nrmLvl2,
            nrmLvl3: entry.nrmLvl3,
            unitOfMeasurement: entry.unitOfMeasurement,
            sarPerUoM: entry.sarPerUoM,
            rcdcCostGfa: entry.sarPerUoM, // Same as sarPerUoM for now
          },
        });
      }
    }

    // Log activity
    const demoUser = await prisma.user.findFirst();
    if (demoUser) {
      await logActivity(
        demoUser.id,
        "updated",
        "cost_model",
        undefined,
        null,
        { entriesCount: entries.length }
      );
    }

    // Revalidate configuration page
    revalidatePath("/configuration");

    return { success: true, message: "Cost model updated successfully" };
  } catch (error) {
    console.error("Error updating cost model:", error);
    return { success: false, error: "Failed to update cost model" };
  }
}

/**
 * Update parametric matrix
 */
export async function updateParametricMatrix(
  entries: Array<{
    nrmLvl1: string;
    parameter: string;
    option: string;
    factor: number;
  }>
) {
  try {
    // Delete all existing entries and create new ones
    await prisma.parametricMatrix.deleteMany({});

    // Create new entries
    await prisma.parametricMatrix.createMany({
      data: entries.map((entry) => ({
        nrmLvl1: entry.nrmLvl1,
        parameter: entry.parameter,
        option: entry.option,
        factor: entry.factor,
      })),
    });

    // Log activity
    const demoUser = await prisma.user.findFirst();
    if (demoUser) {
      await logActivity(
        demoUser.id,
        "updated",
        "parametric_matrix",
        undefined,
        null,
        { entriesCount: entries.length }
      );
    }

    revalidatePath("/configuration");

    return { success: true, message: "Parametric matrix updated successfully" };
  } catch (error) {
    console.error("Error updating parametric matrix:", error);
    return { success: false, error: "Failed to update parametric matrix" };
  }
}

/**
 * Update cost factors
 */
export async function updateCostFactors(
  factors: Array<{
    baseDate: string;
    costUplift: number;
  }>
) {
  try {
    // Delete all and recreate (simpler than update since baseDate is unique)
    await prisma.costFactor.deleteMany({});

    // Create new cost factors
    await prisma.costFactor.createMany({
      data: factors.map((factor) => ({
        baseDate: factor.baseDate,
        costUplift: factor.costUplift,
      })),
    });

    const demoUser = await prisma.user.findFirst();
    if (demoUser) {
      await logActivity(
        demoUser.id,
        "updated",
        "cost_factors",
        undefined,
        null,
        { factorsCount: factors.length }
      );
    }

    revalidatePath("/configuration");

    return { success: true, message: "Cost factors updated successfully" };
  } catch (error) {
    console.error("Error updating cost factors:", error);
    return { success: false, error: "Failed to update cost factors" };
  }
}

/**
 * Update configuration setting
 */
export async function updateConfiguration(
  key: string,
  value: any
) {
  try {
    // Check if configuration exists
    const existing = await prisma.configuration.findUnique({
      where: { key },
    });

    if (existing) {
      // Update existing
      await prisma.configuration.update({
        where: { key },
        data: { value: value },
      });
    } else {
      // Create new
      await prisma.configuration.create({
        data: {
          key,
          value: value,
        },
      });
    }

    const demoUser = await prisma.user.findFirst();
    if (demoUser) {
      await logActivity(
        demoUser.id,
        "updated",
        "configuration",
        key,
        existing?.value,
        value
      );
    }

    revalidatePath("/configuration");

    return { success: true, message: "Configuration updated successfully" };
  } catch (error) {
    console.error("Error updating configuration:", error);
    return { success: false, error: "Failed to update configuration" };
  }
}

/**
 * Export cost model entries to CSV format
 */
export async function exportCostModelCSV(): Promise<{
  success: boolean;
  data?: string;
  error?: string;
  count?: number;
}> {
  try {
    const entries = await prisma.costModelEntry.findMany({
      orderBy: [
        { assetClass: "asc" },
        { assetTypeL1: "asc" },
        { assetFormL2: "asc" },
        { pricePoint: "asc" },
        { nrmLvl1: "asc" },
      ],
    });

    // CSV Header
    const headers = [
      "assetClass",
      "assetTypeL1",
      "assetFormL2",
      "pricePoint",
      "nrmLvl1",
      "nrmLvl2",
      "nrmLvl3",
      "rcdcCostGfa",
      "benchmarkedCostGfa",
    ];

    // Build CSV content
    const csvRows = [headers.join(",")];

    for (const entry of entries) {
      const row = [
        escapeCSV(entry.assetClass),
        escapeCSV(entry.assetTypeL1),
        escapeCSV(entry.assetFormL2 || ""),
        escapeCSV(entry.pricePoint || ""),
        escapeCSV(entry.nrmLvl1),
        escapeCSV(entry.nrmLvl2 || ""),
        escapeCSV(entry.nrmLvl3 || ""),
        entry.rcdcCostGfa?.toString() || "0",
        entry.benchmarkedCostGfa?.toString() || "",
      ];
      csvRows.push(row.join(","));
    }

    const csvContent = csvRows.join("\n");

    // Log activity
    const demoUser = await prisma.user.findFirst();
    if (demoUser) {
      await logActivity(
        demoUser.id,
        "exported",
        "cost_model",
        undefined,
        null,
        { entriesCount: entries.length }
      );
    }

    return {
      success: true,
      data: csvContent,
      count: entries.length,
    };
  } catch (error) {
    console.error("Error exporting cost model:", error);
    return { success: false, error: "Failed to export cost model" };
  }
}

/**
 * Helper function to escape CSV values
 */
function escapeCSV(value: string): string {
  if (!value) return "";
  // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Parse CSV string into array of objects
 */
function parseCSV(csvData: string): Record<string, string>[] {
  const lines = csvData.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];

  // Parse header
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() || "";
      });
      rows.push(row);
    }
  }

  return rows;
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }

  result.push(current);
  return result;
}

/**
 * Import cost model entries from CSV
 * Mode: "replace" = delete all and insert new, "merge" = update existing + insert new
 */
export async function importCostModelCSV(
  csvData: string,
  mode: "replace" | "merge" = "replace"
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  stats?: {
    total: number;
    inserted: number;
    updated: number;
    skipped: number;
  };
}> {
  try {
    const rows = parseCSV(csvData);

    if (rows.length === 0) {
      return { success: false, error: "No valid data found in CSV" };
    }

    // Validate required columns
    const requiredColumns = ["assetClass", "assetTypeL1", "nrmLvl1", "rcdcCostGfa"];
    const firstRow = rows[0];
    const missingColumns = requiredColumns.filter((col) => !(col in firstRow));

    if (missingColumns.length > 0) {
      return {
        success: false,
        error: `Missing required columns: ${missingColumns.join(", ")}`,
      };
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    if (mode === "replace") {
      // Delete all existing entries
      await prisma.costModelEntry.deleteMany({});

      // Insert in batches
      const batchSize = 500;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        await prisma.costModelEntry.createMany({
          data: batch.map((row) => ({
            assetClass: row.assetClass || "",
            assetTypeL1: row.assetTypeL1 || "",
            assetFormL2: row.assetFormL2 || null,
            pricePoint: row.pricePoint || null,
            nrmLvl1: row.nrmLvl1 || "",
            nrmLvl2: row.nrmLvl2 || null,
            nrmLvl3: row.nrmLvl3 || null,
            rcdcCostGfa: parseFloat(row.rcdcCostGfa?.replace(/,/g, "") || "0") || 0,
            benchmarkedCostGfa: row.benchmarkedCostGfa
              ? parseFloat(row.benchmarkedCostGfa.replace(/,/g, ""))
              : null,
          })),
          skipDuplicates: true,
        });
        inserted += batch.length;
      }
    } else {
      // Merge mode: upsert each entry
      for (const row of rows) {
        const uniqueKey = {
          assetClass: row.assetClass || "",
          assetTypeL1: row.assetTypeL1 || "",
          assetFormL2: row.assetFormL2 || null,
          pricePoint: row.pricePoint || null,
          nrmLvl1: row.nrmLvl1 || "",
        };

        try {
          const existing = await prisma.costModelEntry.findFirst({
            where: uniqueKey,
          });

          if (existing) {
            await prisma.costModelEntry.update({
              where: { id: existing.id },
              data: {
                nrmLvl2: row.nrmLvl2 || null,
                nrmLvl3: row.nrmLvl3 || null,
                rcdcCostGfa: parseFloat(row.rcdcCostGfa?.replace(/,/g, "") || "0") || 0,
                benchmarkedCostGfa: row.benchmarkedCostGfa
                  ? parseFloat(row.benchmarkedCostGfa.replace(/,/g, ""))
                  : null,
              },
            });
            updated++;
          } else {
            await prisma.costModelEntry.create({
              data: {
                ...uniqueKey,
                nrmLvl2: row.nrmLvl2 || null,
                nrmLvl3: row.nrmLvl3 || null,
                rcdcCostGfa: parseFloat(row.rcdcCostGfa?.replace(/,/g, "") || "0") || 0,
                benchmarkedCostGfa: row.benchmarkedCostGfa
                  ? parseFloat(row.benchmarkedCostGfa.replace(/,/g, ""))
                  : null,
              },
            });
            inserted++;
          }
        } catch {
          skipped++;
        }
      }
    }

    // Log activity
    const demoUser = await prisma.user.findFirst();
    if (demoUser) {
      await logActivity(
        demoUser.id,
        "imported",
        "cost_model",
        undefined,
        null,
        { mode, inserted, updated, skipped }
      );
    }

    revalidatePath("/configuration");

    return {
      success: true,
      message: `CSV imported successfully`,
      stats: {
        total: rows.length,
        inserted,
        updated,
        skipped,
      },
    };
  } catch (error) {
    console.error("Error importing CSV:", error);
    return { success: false, error: "Failed to import CSV" };
  }
}

/**
 * Delete all cost model entries
 */
export async function clearCostModel(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const result = await prisma.costModelEntry.deleteMany({});
    const demoUser = await prisma.user.findFirst();
    if (demoUser) {
      await logActivity(demoUser.id, "cleared", "cost_model", undefined, { count: result.count }, null);
    }
    revalidatePath("/configuration");
    return { success: true, count: result.count };
  } catch (error) {
    console.error("Error clearing cost model:", error);
    return { success: false, error: "Failed to clear cost model data" };
  }
}
