import { prisma } from "@/lib/prisma";
import { getAccessibleMasterplanIds } from "@/lib/permissions";
import { unstable_cache } from "next/cache";
import { convertDecimalToNumber } from "@/utils/decimal";

// Cache durations in seconds
const CACHE_SHORT = 60; // 1 minute
const CACHE_MEDIUM = 300; // 5 minutes

/**
 * Get all masterplans (filtered by user permissions)
 */
export async function getMasterplans(
  userId?: string,
  filters?: {
    status?: string;
    assetClass?: string;
  }
) {
  // Get accessible masterplan IDs for user (null means all masterplans for admins)
  let accessibleMasterplanIds: string[] | null = null;
  if (userId) {
    accessibleMasterplanIds = await getAccessibleMasterplanIds(userId);
  }

  const masterplans = await prisma.masterplan.findMany({
    where: {
      ...(filters?.status && { status: filters.status as any }),
      ...(filters?.assetClass && { assetClass: filters.assetClass }),
      // Filter by accessible masterplans if user is not admin
      ...(accessibleMasterplanIds !== null && { id: { in: accessibleMasterplanIds } }),
    },
    include: {
      buildingCosts: {
        select: {
          id: true,
          nrmLvl1: true,
          totalCost: true,
        },
      },
      infrastructureCosts: {
        select: {
          id: true,
          category: true,
          cost: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      teamMembers: {
        select: {
          id: true,
          role: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      phases: {
        orderBy: {
          phaseNumber: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Convert Decimal objects to numbers for client components
  return convertDecimalToNumber(masterplans);
}

/**
 * Get a single masterplan by ID - internal function
 */
async function _getMasterplanById(id: string) {
  const masterplan = await prisma.masterplan.findUnique({
    where: { id },
    include: {
      buildingCosts: {
        orderBy: {
          nrmLvl1: "asc",
        },
      },
      infrastructureCosts: {
        orderBy: {
          category: "asc",
        },
      },
      phases: {
        orderBy: {
          phaseNumber: "asc",
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return masterplan;
}

/**
 * Get a single masterplan by ID - cached version
 */
export const getMasterplanById = unstable_cache(
  _getMasterplanById,
  ["masterplan-by-id"],
  { revalidate: CACHE_SHORT, tags: ["masterplans"] }
);

/**
 * Get masterplan with detailed cost calculations
 */
export async function getMasterplanWithCosts(id: string) {
  const masterplan = await getMasterplanById(id);

  if (!masterplan) {
    return null;
  }

  // Calculate total building costs
  const totalBuildingCosts = masterplan.buildingCosts.reduce(
    (sum, cost) => sum + Number(cost.totalCost || 0),
    0
  );

  // Calculate total infrastructure costs
  const totalInfrastructureCosts = masterplan.infrastructureCosts.reduce(
    (sum, cost) => sum + Number(cost.cost || 0),
    0
  );

  // Calculate grand total
  const grandTotal =
    totalBuildingCosts + totalInfrastructureCosts + Number(masterplan.contingency || 0);

  return {
    ...masterplan,
    calculations: {
      totalBuildingCosts,
      totalInfrastructureCosts,
      contingency: masterplan.contingency,
      grandTotal,
      costPerGfa: masterplan.costPerGfa,
    },
  };
}

/**
 * Get masterplan statistics for dashboard - optimized with database aggregation
 */
export async function getMasterplanStats(userId?: string) {
  const whereClause = userId ? { createdById: userId } : {};

  // Use parallel queries for better performance
  const [
    totalProjects,
    statusCounts,
    aggregates,
  ] = await Promise.all([
    // Count total
    prisma.masterplan.count({ where: whereClause }),

    // Count by status using groupBy
    prisma.masterplan.groupBy({
      by: ['status'],
      where: whereClause,
      _count: { id: true },
    }),

    // Aggregate numeric fields
    prisma.masterplan.aggregate({
      where: whereClause,
      _sum: {
        totalUnits: true,
        grossLandArea: true,
        contingency: true,
        totalCost: true,
      },
    }),
  ]);

  // Extract status counts
  const activeProjects = statusCounts.find(s => s.status === 'ACTIVE')?._count.id || 0;
  const draftProjects = statusCounts.find(s => s.status === 'DRAFT')?._count.id || 0;

  const totalUnits = Number(aggregates._sum.totalUnits || 0);
  const totalArea = Number(aggregates._sum.grossLandArea || 0);
  const totalCost = Number(aggregates._sum.totalCost || 0);

  return {
    totalProjects,
    activeProjects,
    draftProjects,
    totalCost,
    totalUnits,
    totalArea,
    avgCostPerGfa: totalArea > 0 ? totalCost / totalArea : 0,
  };
}

/**
 * Get recent masterplans for dashboard
 */
export async function getRecentMasterplans(userId?: string, limit = 5) {
  const masterplans = await prisma.masterplan.findMany({
    where: userId ? { createdById: userId } : {},
    include: {
      buildingCosts: true,
      infrastructureCosts: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });

  return masterplans;
}

/**
 * Get executive summary for a masterplan
 * Returns null if not found
 */
export async function getExecutiveSummary(masterplanId: string): Promise<string | null> {
  // For now, return null as executive summary is stored in version data
  // TODO: Add executiveSummary field to Masterplan model if needed
  return null;
}
