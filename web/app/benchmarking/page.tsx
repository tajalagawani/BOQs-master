import { getSession } from "@/lib/session";
import { getBenchmarkProjects, getRCDCBaseline } from "@/lib/queries/benchmarking";
import { getCostModelEntries } from "@/lib/queries/configuration";
import { prisma } from "@/lib/prisma";
import BenchmarkingClient from "@/components/benchmarking/BenchmarkingClient";
import { convertDecimalToNumber } from "@/utils/decimal";
import { getDropdownOptions } from "@/utils/dropdownOptions";

export const dynamic = "force-dynamic"; // Always fetch fresh data

export default async function BenchmarkingPage() {
  const { user } = await getSession();
  // Fetch benchmark projects from database
  const benchmarkProjectsRaw = await getBenchmarkProjects(user.id);

  // Fetch RCDC baseline from cost model (empty filters = all data as default)
  const rcdcBaselineRaw = await getRCDCBaseline({});

  // Get cost model entries for dropdown options
  const costModelEntries = await getCostModelEntries();

  // Build NRM categories from actual data (uploaded benchmark NRM rows + RCDC baseline keys).
  // The hardcoded list previously here drifted from the seeded names
  // (e.g. "Internal Walls & Doors" vs "Internal Walls and Doors", "Mechanical Services"
  // vs "Mechanical"), producing a chart with mostly empty values.
  const benchmarkCategorySet = new Set<string>();
  for (const project of benchmarkProjectsRaw) {
    for (const nrm of project.nrmData) {
      if (nrm.nrmCategory) benchmarkCategorySet.add(nrm.nrmCategory);
    }
  }
  for (const key of Object.keys(rcdcBaselineRaw.nrmBreakdown)) {
    benchmarkCategorySet.add(key);
  }
  // Preferred ordering — anything not on the list falls to the end alphabetically.
  const nrmOrder = [
    "Substructure",
    "Superstructure",
    "Building External Envelope",
    "Internal Walls & Doors",
    "Internal Walls and Doors",
    "Internal Finishes",
    "FF&E",
    "Sanitary Fittings",
    "Services Equipment",
    "Mechanical Services",
    "Mechanical",
    "Electrical Services",
    "Electrical",
    "Conveying Systems",
    "External Works",
    "General Requirements",
  ];
  const nrmCategories = Array.from(benchmarkCategorySet).sort((a, b) => {
    const ai = nrmOrder.indexOf(a);
    const bi = nrmOrder.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  // Get saved custom filter options
  const savedFiltersConfig = await prisma.configuration.findUnique({
    where: { key: "benchmark_filter_options" },
  });
  const savedFilters = savedFiltersConfig?.value as any;

  // Convert Decimals to numbers for client component
  const benchmarkProjectsAllRaw = convertDecimalToNumber(benchmarkProjectsRaw) as any;
  const rcdcBaseline = convertDecimalToNumber(rcdcBaselineRaw) as any;

  // Filter to only include benchmark projects with NRM data (uploaded via Excel)
  const benchmarkProjectsAll = benchmarkProjectsAllRaw.filter((p: any) => p.nrmData && p.nrmData.length > 0);

  // Extract options from benchmark projects (only uploaded projects with NRM data)
  const projectsFromDb = [...new Set(benchmarkProjectsAll.map((p: any) => p.name))].filter(Boolean).sort() as string[];
  const countriesFromDb = [...new Set(benchmarkProjectsAll.map((p: any) => p.country))].filter(Boolean).sort() as string[];
  const citiesFromDb = [...new Set(benchmarkProjectsAll.map((p: any) => p.city))].filter(Boolean).sort() as string[];
  const developersFromDb = [...new Set(benchmarkProjectsAll.map((p: any) => p.developer))].filter(Boolean).sort() as string[];

  // Get filter options - use saved custom options if available, otherwise use database
  // Note: Check length because empty arrays are truthy in JavaScript
  const assetClassOptions = savedFilters?.assetClass?.length > 0 ? savedFilters.assetClass : getDropdownOptions("assetClass", costModelEntries);
  const assetTypeOptions = savedFilters?.assetType?.length > 0 ? savedFilters.assetType : getDropdownOptions("assetTypeL1", costModelEntries);
  const assetMassingOptions = savedFilters?.assetMassing?.length > 0 ? savedFilters.assetMassing : getDropdownOptions("assetFormL2", costModelEntries);
  const countryOptions = savedFilters?.country?.length > 0 ? savedFilters.country : countriesFromDb;
  const cityOptions = savedFilters?.city?.length > 0 ? savedFilters.city : citiesFromDb;
  const developerOptions = savedFilters?.developer?.length > 0 ? savedFilters.developer : developersFromDb;
  const projectOptions = savedFilters?.project?.length > 0 ? savedFilters.project : projectsFromDb;

  // Filter projects to only show those in the custom project options (if configured)
  // This ensures deleted projects from config don't appear in the chart or anywhere
  const benchmarkProjects = savedFilters?.project?.length > 0
    ? benchmarkProjectsAll.filter((p: any) => savedFilters.project.includes(p.name))
    : benchmarkProjectsAll;

  return (
    <main className="flex-1 min-h-0 overflow-hidden">
      <BenchmarkingClient
        initialProjects={benchmarkProjects}
        rcdcBaseline={rcdcBaseline}
        nrmCategories={nrmCategories}
        assetClassOptions={assetClassOptions}
        assetTypeOptions={assetTypeOptions}
        assetMassingOptions={assetMassingOptions}
        countryOptions={countryOptions}
        cityOptions={cityOptions}
        developerOptions={developerOptions}
        projectOptions={projectOptions}
      />
    </main>
  );
}
