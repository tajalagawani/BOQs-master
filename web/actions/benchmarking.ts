"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity, getCurrentUserServer } from "@/lib/auth";
import { getUserPermissions, canAccessProject } from "@/lib/permissions";
import { convertDecimalToNumber } from "@/utils/decimal";
import * as XLSX from "xlsx";

/**
 * Create a new benchmark project
 */
export async function createBenchmarkProject(data: {
  name: string;
  assetClass?: string;
  assetTypeL1?: string;
  assetFormL2?: string;
  country?: string;
  city?: string;
  developer?: string;
  source?: string;
  currency?: string;
  latitude?: number;
  longitude?: number;
  polygon?: number[][];
  grossLandArea?: number;
  teamMemberIds?: string[];
}) {
  try {
    const currentUser = await getCurrentUserServer();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user can create projects (only admins)
    const permissions = await getUserPermissions(currentUser.id);
    if (!permissions.canCreateProject) {
      return { success: false, error: "You don't have permission to create projects" };
    }

    const project = await prisma.benchmarkProject.create({
      data: {
        name: data.name,
        assetClass: data.assetClass || null,
        assetTypeL1: data.assetTypeL1 || null,
        assetFormL2: data.assetFormL2 || null,
        country: data.country || null,
        city: data.city || null,
        developer: data.developer || null,
        source: data.source || null,
        currency: data.currency || "SAR",
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        polygon: data.polygon ?? undefined,
        grossLandArea: data.grossLandArea || null,
        uploadedById: currentUser.id,
        teamMembers: data.teamMemberIds && data.teamMemberIds.length > 0
          ? {
              create: data.teamMemberIds.map((userId) => ({
                userId,
                assignedBy: currentUser.id,
              })),
            }
          : undefined,
      },
    });

    await logActivity(
      currentUser.id,
      "created",
      "benchmark_project",
      project.id,
      null,
      project
    );

    revalidatePath("/benchmarking");
    revalidatePath("/projects");

    return { success: true, data: project };
  } catch (error) {
    console.error("Error creating benchmark project:", error);
    return { success: false, error: "Failed to create benchmark project" };
  }
}

/**
 * Upload benchmark NRM data for a project
 */
export async function uploadBenchmarkNRMData(
  projectId: string,
  nrmData: Array<{
    nrmCategory: string;
    costGfa: number;
  }>
) {
  try {
    const currentUser = await getCurrentUserServer();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user can update this project
    const canUpdate = await canAccessProject(currentUser.id, projectId, "update");
    if (!canUpdate) {
      return { success: false, error: "You don't have permission to update this project" };
    }

    // Delete existing NRM data for this project
    await prisma.benchmarkNrmData.deleteMany({
      where: { projectId: projectId },
    });

    // Insert new data
    await prisma.benchmarkNrmData.createMany({
      data: nrmData.map((item) => ({
        projectId: projectId,
        nrmCategory: item.nrmCategory,
        costGfa: item.costGfa,
      })),
    });

    await logActivity(
      currentUser.id,
      "uploaded",
      "benchmark_nrm_data",
      projectId,
      null,
      { itemsCount: nrmData.length }
    );

    revalidatePath("/benchmarking");

    return { success: true, message: "NRM data uploaded successfully" };
  } catch (error) {
    console.error("Error uploading NRM data:", error);
    return { success: false, error: "Failed to upload NRM data" };
  }
}

/**
 * Update a benchmark project
 */
export async function updateBenchmarkProject(
  id: string,
  data: {
    name: string;
    assetClass?: string;
    assetTypeL1?: string;
    assetFormL2?: string;
    country?: string;
    city?: string;
    developer?: string;
    source?: string;
    currency?: string;
    latitude?: number;
    longitude?: number;
    polygon?: number[][];
    teamMemberIds?: string[];
  }
) {
  try {
    const currentUser = await getCurrentUserServer();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user can update this project
    const canUpdate = await canAccessProject(currentUser.id, id, "update");
    if (!canUpdate) {
      return { success: false, error: "You don't have permission to update this project" };
    }

    // Only admins can update team members
    const permissions = await getUserPermissions(currentUser.id);
    if (data.teamMemberIds !== undefined) {
      if (!permissions.isAdmin) {
        return { success: false, error: "Only admins can manage team members" };
      }

      // Delete existing team members
      await prisma.benchmarkProjectTeamMember.deleteMany({
        where: { projectId: id },
      });

      // Add new team members
      if (data.teamMemberIds.length > 0) {
        await prisma.benchmarkProjectTeamMember.createMany({
          data: data.teamMemberIds.map((userId) => ({
            projectId: id,
            userId,
            assignedBy: currentUser.id,
          })),
        });
      }
    }

    const project = await prisma.benchmarkProject.update({
      where: { id },
      data: {
        name: data.name,
        assetClass: data.assetClass || null,
        assetTypeL1: data.assetTypeL1 || null,
        assetFormL2: data.assetFormL2 || null,
        country: data.country || null,
        city: data.city || null,
        developer: data.developer || null,
        source: data.source || null,
        currency: data.currency || "SAR",
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        polygon: data.polygon ?? undefined,
      },
    });

    await logActivity(
      currentUser.id,
      "updated",
      "benchmark_project",
      project.id,
      null,
      project
    );

    revalidatePath("/benchmarking");
    revalidatePath("/projects");

    return { success: true, data: project };
  } catch (error) {
    console.error("Error updating benchmark project:", error);
    return { success: false, error: "Failed to update benchmark project" };
  }
}

/**
 * Delete a benchmark project
 */
export async function deleteBenchmarkProject(id: string) {
  try {
    const currentUser = await getCurrentUserServer();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // Only admins can delete projects
    const permissions = await getUserPermissions(currentUser.id);
    if (!permissions.isAdmin) {
      return { success: false, error: "Only admins can delete projects" };
    }

    // Delete related team members
    await prisma.benchmarkProjectTeamMember.deleteMany({
      where: { projectId: id },
    });

    // Delete related NRM data
    await prisma.benchmarkNrmData.deleteMany({
      where: { projectId: id },
    });

    // Delete project
    const project = await prisma.benchmarkProject.delete({
      where: { id },
    });

    await logActivity(
      currentUser.id,
      "deleted",
      "benchmark_project",
      id,
      project,
      null
    );

    revalidatePath("/benchmarking");
    revalidatePath("/projects");

    return { success: true };
  } catch (error) {
    console.error("Error deleting benchmark project:", error);
    return { success: false, error: "Failed to delete benchmark project" };
  }
}

/**
 * Import benchmark data from Excel file
 * Expected format:
 * - Row 1: Headers with "Row Labels" in first column, project names in subsequent columns
 * - Rows 2+: NRM categories in first column, cost values in subsequent columns
 */
export async function importBenchmarkExcel(formData: FormData): Promise<{
  success: boolean;
  error?: string;
  message?: string;
  projectsImported?: number;
}> {
  try {
    const currentUser = await getCurrentUserServer();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user can create projects (only admins)
    const permissions = await getUserPermissions(currentUser.id);
    if (!permissions.canCreateProject) {
      return { success: false, error: "You don't have permission to import projects" };
    }

    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to JSON with headers
    const rawData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: true,
    }) as unknown as (string | number)[][];

    if (rawData.length < 2) {
      return { success: false, error: "File appears to be empty or invalid" };
    }

    // Find the header row (contains "Row Labels" or project names)
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(10, rawData.length); i++) {
      const row = rawData[i];
      if (row && row[0] && String(row[0]).toLowerCase().includes("row labels")) {
        headerRowIndex = i;
        break;
      }
    }

    const headerRow = rawData[headerRowIndex];
    if (!headerRow || headerRow.length < 2) {
      return { success: false, error: "Could not find valid header row" };
    }

    // Extract project names (skip first column which is "Row Labels")
    const projectNames: string[] = [];
    for (let i = 1; i < headerRow.length; i++) {
      const name = headerRow[i];
      if (name && String(name).trim() && !String(name).includes("Grand Total")) {
        projectNames.push(String(name).trim());
      }
    }

    if (projectNames.length === 0) {
      return { success: false, error: "No project columns found in file" };
    }

    // Valid NRM categories
    const validNrmCategories = [
      "Substructure",
      "Superstructure",
      "Building External Envelope",
      "Internal Walls and Doors",
      "Internal Finishes",
      "FF&E",
      "Sanitary Fittings",
      "Services Equipment",
      "Mechanical",
      "Electrical",
      "Conveying Systems",
      "External Works",
      "General Requirements",
    ];

    // Parse NRM data for each project
    const projectsData: Map<string, Map<string, number>> = new Map();

    // Initialize project data maps
    for (const name of projectNames) {
      projectsData.set(name, new Map());
    }

    // Process data rows (skip header row)
    for (let rowIndex = headerRowIndex + 1; rowIndex < rawData.length; rowIndex++) {
      const row = rawData[rowIndex];
      if (!row || !row[0]) continue;

      const nrmCategory = String(row[0]).trim();

      // Skip Grand Total and empty rows
      if (nrmCategory.toLowerCase() === "grand total" || !nrmCategory) continue;

      // Check if this is a valid NRM category
      const matchedCategory = validNrmCategories.find(
        cat => cat.toLowerCase() === nrmCategory.toLowerCase()
      );

      if (!matchedCategory) continue;

      // Extract values for each project
      for (let colIndex = 1; colIndex < Math.min(row.length, projectNames.length + 1); colIndex++) {
        const projectName = projectNames[colIndex - 1];
        const value = row[colIndex];

        if (projectName && value !== undefined && value !== null && value !== "") {
          // Parse the value (handle both numbers and formatted strings like "1,234.56")
          let numValue: number;
          if (typeof value === "number") {
            numValue = value;
          } else {
            const cleanValue = String(value).replace(/,/g, "").trim();
            numValue = parseFloat(cleanValue);
          }

          if (!isNaN(numValue) && numValue >= 0) {
            const projectData = projectsData.get(projectName);
            if (projectData) {
              projectData.set(matchedCategory, numValue);
            }
          }
        }
      }
    }

    // Create benchmark projects in database
    let projectsImported = 0;

    for (const [projectName, nrmData] of projectsData) {
      // Skip projects with no NRM data
      if (nrmData.size === 0) continue;

      // Extract asset type from project name (e.g., "PROJECT 1 Low Rise" -> "Low Rise")
      let assetTypeL1 = "";
      const nameMatch = projectName.match(/(Low Rise|Mid Rise|High Rise|Multi Family)/i);
      if (nameMatch) {
        assetTypeL1 = nameMatch[1];
      }

      // Calculate total cost per GFA
      let totalCostGfa = 0;
      for (const cost of nrmData.values()) {
        totalCostGfa += cost;
      }

      // Create the project
      const project = await prisma.benchmarkProject.create({
        data: {
          name: projectName,
          assetClass: assetTypeL1.includes("Family") ? "Residential" : "Residential",
          assetTypeL1: assetTypeL1 || null,
          assetFormL2: null,
          country: "Saudi Arabia",
          city: null,
          developer: null,
          source: file.name,
          currency: "SAR",
          totalCost: totalCostGfa,
          totalGFA: 1, // Cost values are already per GFA
          costPerGFA: totalCostGfa,
          uploadedById: currentUser.id,
        },
      });

      // Create NRM data entries
      const nrmEntries = Array.from(nrmData.entries()).map(([category, costGfa]) => ({
        projectId: project.id,
        nrmCategory: category,
        costGfa: costGfa,
      }));

      if (nrmEntries.length > 0) {
        await prisma.benchmarkNrmData.createMany({
          data: nrmEntries,
        });
      }

      projectsImported++;
    }

    await logActivity(
      currentUser.id,
      "imported",
      "benchmark_projects",
      undefined,
      undefined,
      { fileName: file.name, projectsImported }
    );

    revalidatePath("/benchmarking");

    return {
      success: true,
      message: `Successfully imported ${projectsImported} projects`,
      projectsImported,
    };
  } catch (error) {
    console.error("Error importing benchmark Excel:", error);
    return { success: false, error: "Failed to import Excel file. Please check the file format." };
  }
}

/**
 * Get RCDC baseline data based on filters
 * Averages the RCDC cost per GFA for each NRM Level 1 category
 */
export async function getRCDCBaselineAction(filters: {
  assetClass?: string;
  assetTypeL1?: string;
  assetFormL2?: string;
}) {
  try {
    const entries = await prisma.costModelEntry.findMany({
      where: {
        ...(filters.assetClass && { assetClass: filters.assetClass }),
        ...(filters.assetTypeL1 && { assetTypeL1: filters.assetTypeL1 }),
        ...(filters.assetFormL2 && { assetFormL2: filters.assetFormL2 }),
      },
    });

    // Group by NRM Level 1 and calculate average.
    // Strip leading "N - " prefix so cost-model keys align with benchmark keys.
    const nrmData: Record<string, { sum: number; count: number }> = {};

    for (const entry of entries) {
      const category = entry.nrmLvl1.replace(/^\s*\d+\s*[-–]\s*/, "").trim();
      if (!nrmData[category]) {
        nrmData[category] = { sum: 0, count: 0 };
      }
      // Use RCDC cost per GFA
      const cost = Number(entry.rcdcCostGfa || 0);
      if (cost > 0) {
        nrmData[category].sum += cost;
        nrmData[category].count += 1;
      }
    }

    // Calculate averages
    const nrmBreakdown: Record<string, number> = {};
    for (const [category, data] of Object.entries(nrmData)) {
      nrmBreakdown[category] = data.count > 0 ? Math.round(data.sum / data.count) : 0;
    }

    return {
      success: true,
      data: {
        name: "RCDC Cost Model",
        nrmBreakdown: convertDecimalToNumber(nrmBreakdown) as Record<string, number>,
      },
    };
  } catch (error) {
    console.error("Error fetching RCDC baseline:", error);
    return { success: false, error: "Failed to fetch RCDC baseline" };
  }
}
