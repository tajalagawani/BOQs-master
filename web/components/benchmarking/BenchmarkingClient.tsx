"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import UploadProjectModal from "./UploadProjectModal";
import { X, Upload } from "lucide-react";
import MultiLineChart from "@/components/charts/MultiLineChart";
import { getRCDCBaselineAction } from "@/actions/benchmarking";
import {
  SuiteInnerShell,
  SuiteInnerHeader,
  SecBar,
  SuiteTiles,
  SuiteButton,
  type SuiteTileData,
} from "@/components/suite";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

interface BenchmarkProject {
  id: string;
  name: string;
  assetClass: string;
  assetTypeL1: string;
  assetFormL2: string | null;
  country: string | null;
  city: string | null;
  developer: string | null;
  totalCost: number | null;
  totalGFA: number | null;
  costPerGFA: number | null;
  nrmData: Array<{
    nrmCategory: string;
    costGfa: number;
  }>;
  uploadedBy: {
    name: string | null;
    email: string;
  };
}

interface Filters {
  assetClass: string;
  assetType: string;
  assetMassing: string;
  country: string;
  city: string;
  developer: string;
  project: string;
}

interface Props {
  initialProjects: BenchmarkProject[];
  rcdcBaseline: {
    name: string;
    nrmBreakdown: Record<string, number>;
  };
  nrmCategories: string[];
  assetClassOptions: string[];
  assetTypeOptions: string[];
  assetMassingOptions: string[];
  countryOptions: string[];
  cityOptions: string[];
  developerOptions: string[];
  projectOptions: string[];
}

// Project colors for chart - expanded palette for many projects
const projectColorPalette = [
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#45B7D1", // Blue
  "#FFA07A", // Salmon
  "#98D8C8", // Mint
  "#DDA0DD", // Plum
  "#F0E68C", // Khaki
  "#87CEEB", // Sky Blue
  "#FFB347", // Orange
  "#77DD77", // Pastel Green
  "#FF69B4", // Hot Pink
  "#20B2AA", // Light Sea Green
  "#BA55D3", // Medium Orchid
  "#F4A460", // Sandy Brown
  "#6495ED", // Cornflower Blue
  "#32CD32", // Lime Green
  "#FF7F50", // Coral
  "#9370DB", // Medium Purple
  "#40E0D0", // Turquoise
  "#EE82EE", // Violet
  "#DAA520", // Goldenrod
  "#00CED1", // Dark Turquoise
  "#FF1493", // Deep Pink
  "#7B68EE", // Medium Slate Blue
  "#3CB371", // Medium Sea Green
];

export default function BenchmarkingClient({
  initialProjects,
  rcdcBaseline,
  nrmCategories,
  assetClassOptions,
  assetTypeOptions,
  assetMassingOptions,
  countryOptions,
  cityOptions,
  developerOptions,
  projectOptions,
}: Props) {
  const [activeTab, setActiveTab] = useState<"buildings" | "infrastructure">("buildings");
  const [showUploadModal, setShowUploadModal] = useState(false);
  // No free-text search on this page (filtering is via the Select controls);
  // the suite top-nav search is a local, page-scoped field.
  const [navSearch, setNavSearch] = useState("");
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>({
    assetClass: "",
    assetType: "",
    assetMassing: "",
    country: "",
    city: "",
    developer: "",
    project: "",
  });

  // Dynamic RCDC baseline based on filters
  const [dynamicRcdcBaseline, setDynamicRcdcBaseline] = useState(rcdcBaseline);

  // Fetch RCDC baseline when asset filters change
  useEffect(() => {
    const fetchRcdcBaseline = async () => {
      // Only fetch if at least one asset filter is set
      if (filters.assetClass || filters.assetType || filters.assetMassing) {
        const result = await getRCDCBaselineAction({
          assetClass: filters.assetClass || undefined,
          assetTypeL1: filters.assetType || undefined,
          assetFormL2: filters.assetMassing || undefined,
        });
        if (result.success && result.data) {
          setDynamicRcdcBaseline(result.data);
        }
      } else {
        // Reset to initial baseline when no filters
        setDynamicRcdcBaseline(rcdcBaseline);
      }
    };

    fetchRcdcBaseline();
  }, [filters.assetClass, filters.assetType, filters.assetMassing, rcdcBaseline]);

  // Convert database projects to chart format
  const projects = initialProjects.map((p) => {
    // Convert NRM data array to cost breakdown object
    const costByNrm: Record<string, number> = {};
    let totalNrmCost = 0;
    p.nrmData.forEach((nrm) => {
      // costGfa is already cost per GFA, no need to divide
      const cost = nrm.costGfa || 0;
      costByNrm[nrm.nrmCategory] = Math.round(cost);
      totalNrmCost += cost;
    });


    // Fill missing NRM categories with 0
    nrmCategories.forEach((cat) => {
      if (!costByNrm[cat]) {
        costByNrm[cat] = 0;
      }
    });

    // Use stored costPerGFA if available, otherwise calculate from NRM data
    const calculatedCostPerGFA = p.costPerGFA || totalNrmCost;

    return {
      id: p.id,
      name: p.name,
      assetClass: p.assetClass,
      assetType: p.assetTypeL1,
      assetMassing: p.assetFormL2 || "",
      country: p.country || "",
      city: p.city || "",
      developer: p.developer || p.uploadedBy.name || p.uploadedBy.email,
      costPerGFA: calculatedCostPerGFA,
      costByNrm,
    };
  });

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.assetClass ||
      filters.assetType ||
      filters.assetMassing ||
      filters.country ||
      filters.city ||
      filters.developer ||
      filters.project
    );
  }, [filters]);

  // Filter projects - only show results when filters are applied
  const filteredProjects = useMemo(() => {
    // Return empty array if no filters are active
    if (!hasActiveFilters) {
      return [];
    }

    return projects.filter((project) => {
      if (filters.assetClass && project.assetClass !== filters.assetClass) return false;
      if (filters.assetType && project.assetType !== filters.assetType) return false;
      if (filters.assetMassing && project.assetMassing !== filters.assetMassing) return false;
      if (filters.country && project.country !== filters.country) return false;
      if (filters.city && project.city !== filters.city) return false;
      if (filters.developer && project.developer !== filters.developer) return false;
      if (filters.project && project.name !== filters.project) return false;
      return true;
    });
  }, [filters, projects, hasActiveFilters]);

  // Projects for calculating average (excludes project-specific filter)
  // This ensures Average represents all projects matching the criteria, not just the selected one
  const projectsForAverage = useMemo(() => {
    if (!hasActiveFilters) {
      return [];
    }

    return projects.filter((project) => {
      // Apply all filters EXCEPT the specific project filter
      if (filters.assetClass && project.assetClass !== filters.assetClass) return false;
      if (filters.assetType && project.assetType !== filters.assetType) return false;
      if (filters.assetMassing && project.assetMassing !== filters.assetMassing) return false;
      if (filters.country && project.country !== filters.country) return false;
      if (filters.city && project.city !== filters.city) return false;
      if (filters.developer && project.developer !== filters.developer) return false;
      // Don't filter by project name - we want average of all matching projects
      return true;
    });
  }, [filters.assetClass, filters.assetType, filters.assetMassing, filters.country, filters.city, filters.developer, projects, hasActiveFilters]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (filteredProjects.length === 0) {
      return { total: 0, avg: 0, lowest: 0, highest: 0 };
    }

    // Get costs from projects, using calculated total from NRM data
    const costs = filteredProjects.map((p) => {
      // Calculate total cost from NRM breakdown
      const totalFromNrm = Object.values(p.costByNrm).reduce((sum, val) => sum + val, 0);
      return totalFromNrm > 0 ? totalFromNrm : (p.costPerGFA || 0);
    }).filter((c) => c > 0);

    if (costs.length === 0) {
      return { total: filteredProjects.length, avg: 0, lowest: 0, highest: 0 };
    }
    return {
      total: filteredProjects.length,
      avg: Math.round(costs.reduce((sum, c) => sum + c, 0) / costs.length),
      lowest: Math.round(Math.min(...costs)),
      highest: Math.round(Math.max(...costs)),
    };
  }, [filteredProjects]);

  // Prepare chart data
  const chartData = useMemo(() => {
    return nrmCategories.map((category) => {
      const dataPoint: Record<string, string | number> = {
        name: category,
        "RCDC Cost Model": dynamicRcdcBaseline.nrmBreakdown[category] || 0,
      };

      // Add selected/filtered projects to the chart
      filteredProjects.forEach((project) => {
        dataPoint[project.name] = project.costByNrm[category] || 0;
      });

      // Calculate average from ALL projects matching asset filters (not just selected project)
      if (projectsForAverage.length > 0) {
        const avg = projectsForAverage.reduce((sum, p) => sum + (p.costByNrm[category] || 0), 0) / projectsForAverage.length;
        dataPoint["Average"] = Math.round(avg);
      }

      return dataPoint;
    });
  }, [filteredProjects, projectsForAverage, nrmCategories, dynamicRcdcBaseline]);

  const resetFilters = () => {
    setFilters({
      assetClass: "",
      assetType: "",
      assetMassing: "",
      country: "",
      city: "",
      developer: "",
      project: "",
    });
  };

  const projectNames = filteredProjects.map((p) => p.name);

  // Prepare chart configuration
  const chartColors = useMemo(() => {
    const colors: Record<string, string> = {
      "RCDC Cost Model": "#000000",
      "Average": "#000000",
    };

    projectNames.forEach((name, index) => {
      colors[name] = projectColorPalette[index % projectColorPalette.length];
    });

    return colors;
  }, [projectNames]);

  const chartDataKeys = useMemo(() => {
    const keys = [...projectNames, "RCDC Cost Model"];
    // Show Average when there are projects to average (based on asset filters)
    if (projectsForAverage.length > 0) {
      keys.push("Average");
    }
    return keys;
  }, [projectNames, projectsForAverage]);

  // Summary stat tiles (suite-styled) — same numbers as the original cards.
  const tiles: SuiteTileData[] = [
    { k: "# Total Project", v: stats.total },
    { k: "Avg Cost/GFA", v: stats.avg.toLocaleString() },
    { k: "Lowest Cost/GFA", v: stats.lowest.toLocaleString() },
    { k: "Highest Cost/GFA", v: stats.highest.toLocaleString() },
  ];

  return (
    <SuiteInnerShell
      crumb={<span className="font-semibold text-[#cdd6e6]">Benchmarking</span>}
      search={navSearch}
      onSearch={setNavSearch}
      header={<SuiteInnerHeader title="Roshn Dashboard" />}
    >
      <div className="p-3">
        {/* Tabs — segmented control, kept as the first content block. */}
        <div className="flex gap-6 border-b border-suite-line mb-4">
          <button
            onClick={() => setActiveTab("buildings")}
            className={`py-2 text-[13px] font-medium border-b-2 transition-colors ${
              activeTab === "buildings"
                ? "border-suite-ink text-suite-ink"
                : "border-transparent text-suite-ink-3 hover:text-suite-ink"
            }`}
          >
            Buildings
          </button>
          <button
            onClick={() => setActiveTab("infrastructure")}
            className={`py-2 text-[13px] font-medium border-b-2 transition-colors ${
              activeTab === "infrastructure"
                ? "border-suite-ink text-suite-ink"
                : "border-transparent text-suite-ink-3 hover:text-suite-ink"
            }`}
          >
            Infrastructure
          </button>
        </div>

        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <div className="w-[300px] flex-shrink-0">
            <div className="rounded-[14px] border border-suite-line bg-suite-card-soft">
              {/* Header */}
              <div className="px-4 py-4 border-b border-suite-line">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-[15px] font-semibold text-suite-ink">Filters</h2>
                  <SuiteButton variant="dark" size="sm" onClick={resetFilters}>
                    Reset
                    <X className="size-3" />
                  </SuiteButton>
                </div>
                <p className="text-[12px] text-suite-ink-3">
                  Filter benchmarking data by asset attributes
                </p>
              </div>

              {/* Filters Content */}
              <div className="p-4">
                <div className="space-y-4">
                  {/* Asset Class */}
                  <div>
                    <label className="block text-[11px] font-medium text-suite-ink-2 mb-1">
                      Asset Class
                    </label>
                    <Select
                      value={filters.assetClass || "all"}
                      onValueChange={(value) =>
                        setFilters({ ...filters, assetClass: value === "all" ? "" : value })
                      }
                    >
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Select an option</SelectItem>
                        {assetClassOptions.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Asset Type */}
                  <div>
                    <label className="block text-[11px] font-medium text-suite-ink-2 mb-1">
                      Asset Type
                    </label>
                    <Select
                      value={filters.assetType || "all"}
                      onValueChange={(value) =>
                        setFilters({ ...filters, assetType: value === "all" ? "" : value })
                      }
                    >
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Select an option</SelectItem>
                        {assetTypeOptions.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Asset Massing */}
                  <div>
                    <label className="block text-[11px] font-medium text-suite-ink-2 mb-1">
                      Asset Massing
                    </label>
                    <Select
                      value={filters.assetMassing || "all"}
                      onValueChange={(value) =>
                        setFilters({ ...filters, assetMassing: value === "all" ? "" : value })
                      }
                    >
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Select an option</SelectItem>
                        {assetMassingOptions.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-[11px] font-medium text-suite-ink-2 mb-1">
                      Country
                    </label>
                    <Select
                      value={filters.country || "all"}
                      onValueChange={(value) =>
                        setFilters({ ...filters, country: value === "all" ? "" : value })
                      }
                    >
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Select an option</SelectItem>
                        {countryOptions.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-[11px] font-medium text-suite-ink-2 mb-1">
                      City
                    </label>
                    <Select
                      value={filters.city || "all"}
                      onValueChange={(value) =>
                        setFilters({ ...filters, city: value === "all" ? "" : value })
                      }
                    >
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Select an option</SelectItem>
                        {cityOptions.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Developer */}
                  <div>
                    <label className="block text-[11px] font-medium text-suite-ink-2 mb-1">
                      Developer
                    </label>
                    <Select
                      value={filters.developer || "all"}
                      onValueChange={(value) =>
                        setFilters({ ...filters, developer: value === "all" ? "" : value })
                      }
                    >
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Select an option</SelectItem>
                        {developerOptions.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Project */}
                  <div>
                    <label className="block text-[11px] font-medium text-suite-ink-2 mb-1">
                      Project
                    </label>
                    <Select
                      value={filters.project || "all"}
                      onValueChange={(value) =>
                        setFilters({ ...filters, project: value === "all" ? "" : value })
                      }
                    >
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Select an option</SelectItem>
                        {projectOptions.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Dashboard Area */}
          <div className="flex-1 min-w-0">
            {/* Summary Tiles */}
            <SuiteTiles items={tiles} cols={4} className="mb-4" />

            {/* Chart Section */}
            <div className="rounded-[14px] border border-suite-line bg-suite-panel flex flex-col">
              {/* Chart Header */}
              <SecBar
                title="Sum of cost/GFA"
                actions={
                  <>
                    <SuiteButton variant="dark" size="sm">
                      Data
                    </SuiteButton>
                    <SuiteButton size="sm" onClick={() => setShowUploadModal(true)}>
                      <Upload className="size-4" strokeWidth={2} />
                      Upload Data
                    </SuiteButton>
                  </>
                }
              />

              {/* Chart with Legend */}
              <div className="flex overflow-hidden border-t border-suite-line">
                {/* Chart Area */}
                <div className="flex-1 p-4 flex items-center justify-center min-w-0">
                  {!hasActiveFilters ? (
                    <div className="h-[400px] flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-suite-ink-2 text-[13px]">Select filters to view benchmarking data</p>
                        <p className="text-suite-ink-3 text-[12px] mt-1">Use the filters on the left to compare projects</p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MultiLineChart
                        data={chartData}
                        dataKeys={chartDataKeys}
                        colors={chartColors}
                        height={400}
                      />
                    </div>
                  )}
                </div>

                {/* Legend Panel */}
                <div className="w-[180px] border-l border-suite-line p-4 overflow-auto flex-shrink-0 bg-suite-card-soft">
                  <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-suite-ink-4 mb-3">Legend</p>
                  {!hasActiveFilters ? (
                    <p className="text-[12px] text-suite-ink-3">No projects selected</p>
                  ) : (
                    <div className="space-y-2">
                      {projectNames.map((name, index) => (
                        <div key={name} className="flex items-center gap-2">
                          <div
                            className="w-4 h-0.5 flex-shrink-0"
                            style={{ backgroundColor: projectColorPalette[index % projectColorPalette.length] }}
                          />
                          <span className="text-[12px] text-suite-ink-2 truncate">{name}</span>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 pt-2 border-t border-suite-line mt-2">
                        <div className="w-4 h-0.5 bg-black flex-shrink-0" />
                        <span className="text-[12px] text-suite-ink-2">RCDC Cost Model</span>
                      </div>
                      {projectsForAverage.length > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-1 bg-black flex-shrink-0" />
                          <span className="text-[12px] text-suite-ink-2 font-medium">Average ({projectsForAverage.length} projects)</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Project Modal */}
      <UploadProjectModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={() => router.refresh()}
      />
    </SuiteInnerShell>
  );
}
