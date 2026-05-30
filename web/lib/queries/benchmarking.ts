import { prisma } from "@/lib/prisma";
import { getAccessibleProjectIds } from "@/lib/permissions";
import { unstable_cache } from "next/cache";

// Cache durations in seconds
const CACHE_SHORT = 60; // 1 minute
const CACHE_MEDIUM = 300; // 5 minutes

/**
 * Get all benchmark projects (filtered by user permissions)
 */
export async function getBenchmarkProjects(
  userId?: string,
  filters?: {
    assetClass?: string;
    assetTypeL1?: string;
    assetFormL2?: string;
  }
) {
  // Get accessible project IDs for user (null means all projects for admins)
  let accessibleProjectIds: string[] | null = null;
  if (userId) {
    accessibleProjectIds = await getAccessibleProjectIds(userId);
  }

  const projects = await prisma.benchmarkProject.findMany({
    where: {
      ...(filters?.assetClass && { assetClass: filters.assetClass }),
      ...(filters?.assetTypeL1 && { assetTypeL1: filters.assetTypeL1 }),
      ...(filters?.assetFormL2 && { assetFormL2: filters.assetFormL2 }),
      // Filter by accessible projects if user is not admin
      ...(accessibleProjectIds !== null && { id: { in: accessibleProjectIds } }),
    },
    include: {
      nrmData: true,
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      teamMembers: {
        select: {
          role: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      },
      _count: {
        select: {
          masterplans: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return projects;
}

/**
 * Get all users for team member selection
 */
export async function getUsers() {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return users;
}

/**
 * Get a single benchmark project by ID - internal function
 */
async function _getBenchmarkProjectById(id: string) {
  const project = await prisma.benchmarkProject.findUnique({
    where: { id },
    include: {
      nrmData: {
        orderBy: {
          nrmCategory: "asc",
        },
      },
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return project;
}

/**
 * Get a single benchmark project by ID - cached version
 */
export const getBenchmarkProjectById = unstable_cache(
  _getBenchmarkProjectById,
  ["benchmark-project-by-id"],
  { revalidate: CACHE_SHORT, tags: ["benchmark-projects"] }
);

/**
 * Get benchmark statistics - optimized with database aggregation
 */
export async function getBenchmarkStats() {
  // Use parallel queries with database aggregation for better performance
  const [totalProjects, aggregates] = await Promise.all([
    prisma.benchmarkProject.count(),
    prisma.benchmarkProject.aggregate({
      _sum: {
        totalCost: true,
        totalGFA: true,
      },
    }),
  ]);

  const totalCost = Number(aggregates._sum.totalCost || 0);
  const totalGFA = Number(aggregates._sum.totalGFA || 0);
  const avgCostPerGFA = totalGFA > 0 ? totalCost / totalGFA : 0;

  return {
    totalProjects,
    totalCost,
    totalGFA,
    avgCostPerGFA,
  };
}

/**
 * Compare benchmark projects
 */
export async function compareBenchmarkProjects(projectIds: string[]) {
  const projects = await prisma.benchmarkProject.findMany({
    where: {
      id: { in: projectIds },
    },
    include: {
      nrmData: true,
    },
  });

  // Calculate comparison metrics
  const comparison = projects.map((project) => {
    const nrmBreakdown: Record<string, number> = {};

    for (const nrm of project.nrmData) {
      if (!nrmBreakdown[nrm.nrmCategory]) {
        nrmBreakdown[nrm.nrmCategory] = 0;
      }
      // costGfa is already cost per GFA
      nrmBreakdown[nrm.nrmCategory] += Number(nrm.costGfa);
    }

    return {
      id: project.id,
      name: project.name,
      totalCost: Number(project.totalCost),
      costPerGFA: Number(project.costPerGFA),
      totalGFA: Number(project.totalGFA),
      nrmBreakdown,
    };
  });

  return comparison;
}

/**
 * Get RCDC baseline data from cost model
 * Averages the RCDC cost per GFA for each NRM Level 1 category
 */
export async function getRCDCBaseline(filters?: {
  assetClass?: string;
  assetTypeL1?: string;
  assetFormL2?: string;
  pricePoint?: string;
}) {
  const entries = await prisma.costModelEntry.findMany({
    where: {
      ...(filters?.assetClass && { assetClass: filters.assetClass }),
      ...(filters?.assetTypeL1 && { assetTypeL1: filters.assetTypeL1 }),
      ...(filters?.assetFormL2 && { assetFormL2: filters.assetFormL2 }),
      ...(filters?.pricePoint && { pricePoint: filters.pricePoint }),
    },
  });

  // Group by NRM Level 1 and calculate average
  // Strip leading "N - " prefix so cost-model keys ("1 - Substructure")
  // align with benchmark project keys ("Substructure")
  const nrmData: Record<string, { sum: number; count: number }> = {};

  for (const entry of entries) {
    const category = normalizeNrmCategory(entry.nrmLvl1);
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
    name: "RCDC Baseline",
    nrmBreakdown,
  };
}

// Strips a leading numeric prefix like "1 - " or "01 - " from NRM Level 1 names.
// Cost-model entries store prefixed names; benchmark NRM data does not.
export function normalizeNrmCategory(name: string): string {
  return name.replace(/^\s*\d+\s*[-–]\s*/, "").trim();
}
