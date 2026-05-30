/**
 * Instructional content for the Masterplan Summary page
 * Centralized here for easy updates and potential translation
 */

export const SUMMARY_PAGE_CONTENT = {
  // Section descriptions
  sections: {
    masterplanHighLevel: {
      title: "Masterplan High Level",
      description:
        "This section provides a comprehensive overview of the masterplan's key metrics. These figures represent the total scope, cost, and efficiency indicators for the entire development.",
    },
    costTrend: {
      title: "Cost Trend",
      description:
        "The Cost Trend chart displays the projected expenditure over time using S-Curve methodology. This visualization helps track cumulative spending against planned milestones and identify potential cash flow issues early.",
    },
    areaAnalysis: {
      title: "Area Analysis & Development Efficiency",
      description:
        "Development efficiency metrics measure how effectively the available land is being utilized. The Floor Area Ratio (FAR) is a critical indicator of development density and directly impacts project economics.",
    },
    gfaDistribution: {
      title: "GFA Distribution",
      description:
        "Understanding how Gross Floor Area is distributed across different asset classes, types, typologies, and price points helps assess the development's product mix and market positioning.",
    },
    costDistribution: {
      title: "Cost Distribution",
      description:
        "Cost distribution analysis reveals how the total project budget is allocated across different dimensions. This helps identify major cost drivers and opportunities for optimization.",
    },
    capexBreakdown: {
      title: "Capex Breakdown",
      description:
        "The Capital Expenditure breakdown provides a detailed view of all cost components. Expand each category to see line-item details and understand where every SAR is allocated.",
    },
    costModelAnalysis: {
      title: "Cost Model Analysis",
      description:
        "The Cost Model Analysis breaks down construction costs by NRM (New Rules of Measurement) categories. This standardized classification enables benchmarking against industry standards and similar projects.",
    },
    executiveSummary: {
      title: "Executive Summary",
      description:
        "The Executive Summary captures key observations, recommendations, and strategic insights about this masterplan. This section is editable and can be updated as the project evolves.",
    },
  },

  // Metric tooltips
  metricTooltips: {
    totalGLA: "Gross Leasable Area - the total floor space available for lease or sale",
    far: "Floor Area Ratio - ratio of total building floor area to the plot size. Higher FAR means denser development",
    phases: "Number of construction phases planned for the development",
    plotArea: "Total land area allocated for the development",
    gfa: "Gross Floor Area - total area of all floors of all buildings",
    approvedBudget: "The officially approved budget for the project",
    buaForParking: "Built-Up Area dedicated to parking facilities",
    baseDate: "Reference date for cost estimates and pricing",
    constructionCostHard: "Direct construction costs excluding soft costs",
    totalBUA: "Total Built-Up Area across all assets",
    builtAssetsCost: "Total cost of all building assets",
    totalConstructionCost: "Complete construction cost including soft costs",
    plotAreaBuildings: "Land area specifically allocated to building footprints",
    infraPRCost: "Infrastructure and Public Realm costs",
    variance: "Difference between approved budget and actual/estimated cost",
  },

  // Insight cards
  insights: {
    kpiGauges: {
      type: "info" as const,
      title: "Key Performance Indicators",
      description:
        "These gauges show progress toward key targets. Green indicates on-track performance, yellow suggests attention needed, and red highlights areas requiring immediate review.",
    },
    costTrendTip: {
      type: "tip" as const,
      title: "Cash Flow Planning",
      description:
        "Compare the S-curve progression against your payment milestones to ensure adequate cash flow planning.",
    },
    farOptimization: {
      type: "warning" as const,
      title: "Optimization Opportunity",
      description:
        "Current FAR is below target. Consider reviewing building heights or footprints to maximize development potential.",
    },
    farWellOptimized: {
      type: "success" as const,
      title: "Well Optimized",
      description:
        "Development density is close to the target FAR, indicating efficient land utilization.",
    },
    marketMix: {
      type: "info" as const,
      title: "Market Mix Analysis",
      description:
        "Review the distribution to ensure alignment with market demand studies and sales projections.",
    },
    costDrivers: {
      type: "info" as const,
      title: "Cost Driver Identification",
      description:
        "The largest segments in these charts represent the biggest cost drivers. Focus optimization efforts on these areas for maximum impact.",
    },
    benchmarking: {
      type: "tip" as const,
      title: "Benchmarking Tip",
      description:
        "Compare these percentages against industry benchmarks to identify potential cost optimization opportunities or areas requiring further review.",
    },
  },

  // Explainer content
  explainers: {
    costTrend: {
      title: "How to Read This Chart",
      explanation:
        "The S-Curve shows cumulative cost progression over time. A steeper curve indicates faster spending. Phase areas represent spending by construction phase, while bar charts show monthly or quarterly cost increments.",
      benchmark: "If actual spending exceeds the S-curve, the project may be ahead of schedule or over budget.",
    },
    far: {
      title: "Understanding FAR",
      explanation:
        "Floor Area Ratio is calculated by dividing the total building floor area by the gross land area. Higher FAR means more sellable/leasable area per unit of land, typically improving project ROI.",
      formula: "FAR = Total Building Floor Area / Gross Land Area",
      benchmark: "Target FAR is determined by zoning regulations and development permits.",
    },
  },

  // Chart explanations
  chartExplanations: {
    gfaByAssetClass: "Distribution between Residential, Commercial, Retail, etc.",
    gfaByAssetType: "More detailed breakdown (Villas, Apartments, Offices, etc.)",
    gfaByTypology: "Building form distribution (High-rise, Mid-rise, Low-rise)",
    gfaByPricePoint: "Market segment targeting (Luxury, Premium, Standard, Affordable)",
    costByAssetClass: "Which asset categories consume the most budget",
    costsByPhase: "How costs are distributed across construction phases",
    costByAssetType: "Detailed cost breakdown by specific asset types",
  },

  // NRM Categories
  nrmCategories: {
    "Facilitating Works": "Site preparation, demolition, temporary works",
    "Substructure": "Foundations and basement construction",
    "Superstructure": "Main building frame and upper floors",
    "Building External Envelope": "Facades, roofing, external doors/windows",
    "Internal Walls & Doors": "Partitions and internal doors",
    "Internal Finishes": "Floor, wall, and ceiling finishes",
    "FF&E": "Furniture, Fixtures & Equipment",
    "Services Equipment": "Building services plant and equipment",
    "Sanitary Fittings": "Bathrooms and sanitary installations",
    "Mechanical Services": "HVAC, plumbing systems",
    "Electrical Services": "Power, lighting, communications",
    "External Works": "Landscaping, external paving, drainage",
    "Conveying Systems": "Elevators, escalators",
    "General Requirements": "Preliminaries, overheads, profit",
  },

  // Capex table categories
  capexCategories: {
    coreBuilding: "Main buildings including residential, commercial, and retail",
    carParking: "Surface and structured parking facilities",
    additionalAssets: "Ancillary buildings and facilities",
    publicRealm: "Parks, landscaping, and public spaces",
    infrastructure: "Roads, utilities, and services",
    otherCosts: "Soft costs, fees, and contingencies",
  },

  // Executive summary placeholder
  executiveSummaryPlaceholder:
    "Consider including: Key findings, risk factors, optimization recommendations, approval status, and next steps.",
};

export default SUMMARY_PAGE_CONTENT;
