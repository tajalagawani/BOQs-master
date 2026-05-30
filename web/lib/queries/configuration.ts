import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

// Cache durations in seconds
const CACHE_SHORT = 60; // 1 minute
const CACHE_MEDIUM = 300; // 5 minutes
const CACHE_LONG = 3600; // 1 hour

/**
 * Get all cost model entries - internal function
 */
async function _getCostModelEntries(filters?: {
  assetClass?: string;
  assetTypeL1?: string;
  assetFormL2?: string;
  pricePoint?: string;
  nrmLvl1?: string;
}) {
  const entries = await prisma.costModelEntry.findMany({
    where: {
      ...(filters?.assetClass && { assetClass: filters.assetClass }),
      ...(filters?.assetTypeL1 && { assetTypeL1: filters.assetTypeL1 }),
      ...(filters?.assetFormL2 && { assetFormL2: filters.assetFormL2 }),
      ...(filters?.pricePoint && { pricePoint: filters.pricePoint }),
      ...(filters?.nrmLvl1 && { nrmLvl1: filters.nrmLvl1 }),
    },
    orderBy: [
      { assetClass: "asc" },
      { assetTypeL1: "asc" },
      { nrmLvl1: "asc" },
    ],
  });

  return entries;
}

/**
 * Get all cost model entries - cached version
 */
export const getCostModelEntries = unstable_cache(
  _getCostModelEntries,
  ["cost-model-entries"],
  { revalidate: CACHE_MEDIUM, tags: ["cost-model"] }
);

/**
 * Get parametric matrix entries
 */
export async function getParametricMatrix(filters?: {
  parameter?: string;
  option?: string;
}) {
  const entries = await prisma.parametricMatrix.findMany({
    where: {
      ...(filters?.parameter && { parameter: filters.parameter }),
      ...(filters?.option && { option: filters.option }),
    },
    orderBy: [
      { parameter: "asc" },
      { option: "asc" },
      { nrmLvl1: "asc" },
    ],
  });

  return entries;
}

/**
 * Get cost factors
 */
export async function getCostFactors() {
  const factors = await prisma.costFactor.findMany({
    orderBy: {
      baseDate: "asc",
    },
  });

  return factors;
}

/**
 * Get configuration value by key
 */
export async function getConfiguration(key: string) {
  const config = await prisma.configuration.findUnique({
    where: { key },
  });

  return config?.value;
}

/**
 * Get all configurations
 */
export async function getAllConfigurations() {
  const configs = await prisma.configuration.findMany();

  const configMap: Record<string, any> = {};
  for (const config of configs) {
    configMap[config.key] = config.value;
  }

  return configMap;
}

/**
 * Get asset hierarchy from cost model entries - internal function
 */
async function _getAssetHierarchy() {
  const entries = await prisma.costModelEntry.findMany({
    select: {
      assetClass: true,
      assetTypeL1: true,
      assetFormL2: true,
      pricePoint: true,
    },
    distinct: ["assetClass", "assetTypeL1", "assetFormL2", "pricePoint"],
    orderBy: [
      { assetClass: "asc" },
      { assetTypeL1: "asc" },
      { assetFormL2: "asc" },
      { pricePoint: "asc" },
    ],
  });

  // Build hierarchical structure
  const hierarchy: Record<string, any> = {};

  for (const entry of entries) {
    if (!hierarchy[entry.assetClass]) {
      hierarchy[entry.assetClass] = {};
    }

    if (!hierarchy[entry.assetClass][entry.assetTypeL1]) {
      hierarchy[entry.assetClass][entry.assetTypeL1] = {};
    }

    if (entry.assetFormL2) {
      if (!hierarchy[entry.assetClass][entry.assetTypeL1][entry.assetFormL2]) {
        hierarchy[entry.assetClass][entry.assetTypeL1][entry.assetFormL2] = [];
      }

      if (entry.pricePoint) {
        hierarchy[entry.assetClass][entry.assetTypeL1][entry.assetFormL2].push(entry.pricePoint);
      }
    }
  }

  return hierarchy;
}

/**
 * Get asset hierarchy from cost model entries - cached version
 */
export const getAssetHierarchy = unstable_cache(
  _getAssetHierarchy,
  ["asset-hierarchy"],
  { revalidate: CACHE_LONG, tags: ["cost-model"] }
);

/**
 * Get NRM categories from cost model - internal function
 */
async function _getNRMCategories() {
  const entries = await prisma.costModelEntry.findMany({
    select: {
      nrmLvl1: true,
      nrmLvl2: true,
      nrmLvl3: true,
    },
    distinct: ["nrmLvl1", "nrmLvl2", "nrmLvl3"],
    orderBy: [
      { nrmLvl1: "asc" },
      { nrmLvl2: "asc" },
      { nrmLvl3: "asc" },
    ],
  });

  // Build hierarchical structure
  const hierarchy: Record<string, any> = {};

  for (const entry of entries) {
    if (!hierarchy[entry.nrmLvl1]) {
      hierarchy[entry.nrmLvl1] = {};
    }

    if (entry.nrmLvl2) {
      if (!hierarchy[entry.nrmLvl1][entry.nrmLvl2]) {
        hierarchy[entry.nrmLvl1][entry.nrmLvl2] = [];
      }

      if (entry.nrmLvl3) {
        hierarchy[entry.nrmLvl1][entry.nrmLvl2].push(entry.nrmLvl3);
      }
    }
  }

  return hierarchy;
}

/**
 * Get NRM categories from cost model - cached version
 */
export const getNRMCategories = unstable_cache(
  _getNRMCategories,
  ["nrm-categories"],
  { revalidate: CACHE_LONG, tags: ["cost-model"] }
);

/**
 * Get cost model statistics - optimized with parallel queries
 */
export async function getCostModelStats() {
  // Run all queries in parallel for better performance
  const [totalEntries, assetClasses, nrmCategories] = await Promise.all([
    prisma.costModelEntry.count(),
    prisma.costModelEntry.findMany({
      select: { assetClass: true },
      distinct: ["assetClass"],
    }),
    prisma.costModelEntry.findMany({
      select: { nrmLvl1: true },
      distinct: ["nrmLvl1"],
    }),
  ]);

  return {
    totalEntries,
    totalAssetClasses: assetClasses.length,
    totalNRMCategories: nrmCategories.length,
  };
}
