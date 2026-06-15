"use client";

import { useMemo, useState } from "react";
import { X as CloseIcon } from "lucide-react";
import {
  SuiteInnerShell,
  SuiteInnerHeader,
  SuiteButton,
} from "@/components/suite";
import type { HighLevelMetricsData } from "./summary/HighLevelMetrics";
import CapexBreakdownSummary, { CapexBreakdownData } from "./summary/CapexBreakdownSummary";
import { CostTrendChart } from "@/components/charts/AreaLineChart";
import CostModelAnalysis, { AreaAnalysisMetrics } from "./summary/CostModelAnalysis";
import GFADistributionCharts from "./summary/GFADistributionCharts";
import CostAnalysisCharts from "./summary/CostAnalysisCharts";
import DevelopmentEfficiencyCharts from "./summary/DevelopmentEfficiencyCharts";
import ExecutiveSummary from "./summary/ExecutiveSummary";
import {
  calculateHighLevelMetrics,
  calculateGFAByAssetClass,
  calculateGFAByAssetType,
  calculateGFAByTypology,
  calculateGFAByPricePoint,
  calculateCostByAssetClass,
  calculateCostByPhase,
  calculateCostByAssetType,
  aggregateCostsByNRM,
  calculateFARByAssetClass,
  calculateFARByAssetType,
  generateSCurveData,
  generateSCurveDataWithPhases,
  getPhases,
  SCurveSettings,
  PhaseCostInfo,
} from "@/lib/calculations/masterplanSummary";
import type { MasterplanVersion, PhaseTimeline } from "@/types/masterplan";
import { Card, CardContent } from "@/components/ui/Card";
import { RadialChartGrid, RadialChartCardProps } from "@/components/charts/RadialChart";
import { KPIStatGrid, KPIStatCardProps } from "@/components/charts/KPIStatCard";
import { CHART_COLORS } from "@/lib/chartColors";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { InsightCard } from "@/components/ui/InsightCard";
import { MetricExplainer } from "@/components/ui/MetricExplainer";
import { Accordion, AccordionStat } from "@/components/ui/Accordion";
import { SUMMARY_PAGE_CONTENT } from "@/lib/content/summaryPageContent";

interface Masterplan {
  id: string;
  masterplanName: string;
  totalCost: number;
  grossLandArea: number;
  calculatedPlotArea: number;
  numberOfPhases?: number;
}

interface MasterplanSummaryClientProps {
  masterplan: Masterplan;
  version: MasterplanVersion;
  executiveSummary?: string;
  onSaveExecutiveSummary?: (summary: string) => Promise<void>;
  costModelEntries?: any[];
  phaseTimeline?: PhaseTimeline[];
  scurveSettings?: SCurveSettings;
}

export default function MasterplanSummaryClient({
  masterplan,
  version,
  executiveSummary = "",
  onSaveExecutiveSummary,
  costModelEntries,
  phaseTimeline = [],
  scurveSettings,
}: MasterplanSummaryClientProps) {
  // Local-only top-nav search state (no page-level search on this route).
  const [navSearch, setNavSearch] = useState("");

  // Ensure arrays exist with defaults
  const buildingAssets = version?.buildingAssets || [];
  const carParking = version?.carParking || [];
  const additionalAssets = version?.additionalAssets || [];
  const publicRealm = version?.publicRealm || [];
  const infrastructure = version?.infrastructure || null;
  const otherCosts = version?.otherCosts || null;

  // Calculate all derived data
  const highLevelMetrics = useMemo<HighLevelMetricsData>(() => {
    return calculateHighLevelMetrics(
      buildingAssets,
      carParking,
      additionalAssets,
      infrastructure,
      publicRealm,
      otherCosts,
      masterplan.totalCost
    );
  }, [buildingAssets, carParking, additionalAssets, infrastructure, publicRealm, otherCosts, masterplan.totalCost]);

  // Capex breakdown data
  const capexBreakdownData = useMemo<CapexBreakdownData>(() => ({
    buildingAssets,
    carParking,
    additionalAssets,
    publicRealm,
    infrastructure,
    otherCosts,
  }), [buildingAssets, carParking, additionalAssets, publicRealm, infrastructure, otherCosts]);

  // GFA distribution data
  const gfaByAssetClass = useMemo(() => calculateGFAByAssetClass(buildingAssets), [buildingAssets]);
  const gfaByAssetType = useMemo(() => calculateGFAByAssetType(buildingAssets), [buildingAssets]);
  const gfaByTypology = useMemo(() => calculateGFAByTypology(buildingAssets), [buildingAssets]);
  const gfaByPricePoint = useMemo(() => calculateGFAByPricePoint(buildingAssets), [buildingAssets]);

  // Cost distribution data
  const costByAssetClass = useMemo(() => calculateCostByAssetClass(buildingAssets), [buildingAssets]);
  const costByPhase = useMemo(() => calculateCostByPhase(buildingAssets, carParking, infrastructure), [buildingAssets, carParking, infrastructure]);
  const costByAssetType = useMemo(() => calculateCostByAssetType(buildingAssets), [buildingAssets]);

  // Cost model analysis (NRM categories) - using cost model data from CSV
  const costModelData = useMemo(() => aggregateCostsByNRM(buildingAssets, costModelEntries), [buildingAssets, costModelEntries]);

  // FAR analysis data
  const farByAssetClass = useMemo(() => calculateFARByAssetClass(buildingAssets), [buildingAssets]);
  const farByAssetType = useMemo(() => calculateFARByAssetType(buildingAssets), [buildingAssets]);

  // S-Curve data - use per-phase calculation if phase timeline is available
  const phases = useMemo(() => getPhases(buildingAssets), [buildingAssets]);
  const costTrendData = useMemo(() => {
    // If we have phase timeline data, use the new per-phase calculation
    if (phaseTimeline && phaseTimeline.length > 0) {
      // Calculate cost per phase based on asset distribution
      const costByPhaseData = calculateCostByPhase(buildingAssets, carParking, infrastructure);
      const totalCost = highLevelMetrics.totalConstructionCost;

      // Create phase cost info from timeline and cost distribution
      const phaseCosts: PhaseCostInfo[] = phaseTimeline.map((phase, index) => {
        // Try to find matching cost from costByPhaseData, or distribute evenly
        const matchingCost = costByPhaseData.find(c => c.name === phase.phaseName);
        const phaseCost = matchingCost?.value || (totalCost / phaseTimeline.length);

        return {
          phaseNumber: phase.phaseNumber,
          phaseName: phase.phaseName,
          startDate: phase.startDate,
          totalMonths: phase.totalMonths,
          totalCost: phaseCost,
        };
      });

      return generateSCurveDataWithPhases(phaseCosts, scurveSettings);
    }

    // Fallback to legacy calculation (use default duration from settings)
    const baseDate = buildingAssets.find(a => a.baseDate)?.baseDate || "";
    const defaultDuration = scurveSettings?.defaultPhaseDuration || 36;
    return generateSCurveData(phases, highLevelMetrics.totalConstructionCost, baseDate, defaultDuration, scurveSettings);
  }, [phases, highLevelMetrics.totalConstructionCost, buildingAssets, phaseTimeline, scurveSettings, carParking, infrastructure]);

  // Get unique filter options
  const assetClasses = useMemo(() =>
    [...new Set(buildingAssets.map(a => a.assetClass).filter(Boolean))],
    [buildingAssets]
  );
  const assetTypes = useMemo(() =>
    [...new Set(buildingAssets.map(a => a.assetTypeL1).filter(Boolean))],
    [buildingAssets]
  );

  // Area analysis metrics
  const residentialGFA = useMemo(() =>
    buildingAssets
      .filter(a => a.assetClass?.toLowerCase().includes("residential"))
      .reduce((sum, a) => sum + (a.totalGFA || 0), 0),
    [buildingAssets]
  );
  const commercialGFA = useMemo(() =>
    buildingAssets
      .filter(a => a.assetClass?.toLowerCase().includes("commercial"))
      .reduce((sum, a) => sum + (a.totalGFA || 0), 0),
    [buildingAssets]
  );

  // Calculate actual and target FAR
  const actualFAR = highLevelMetrics.far;
  const targetFAR = masterplan.calculatedPlotArea / masterplan.grossLandArea;

  // Key metrics for radial charts
  const keyMetricsRadial = useMemo<RadialChartCardProps[]>(() => {
    const approvedBudget = highLevelMetrics.approvedBudget || highLevelMetrics.totalConstructionCost;
    return [
      {
        title: "Budget Utilization",
        subtitle: "Total Cost vs Budget",
        value: highLevelMetrics.totalConstructionCost,
        total: approvedBudget,
        color: highLevelMetrics.totalConstructionCost > approvedBudget ? CHART_COLORS.negative : CHART_COLORS.primary,
      },
      {
        title: "Hard Cost Ratio",
        subtitle: "Construction Hard Cost",
        value: highLevelMetrics.constructionCostHard,
        total: highLevelMetrics.totalConstructionCost,
        color: CHART_COLORS.palette[1],
      },
      {
        title: "Built Assets",
        subtitle: "Built Assets Cost",
        value: highLevelMetrics.builtAssetsCost,
        total: highLevelMetrics.totalConstructionCost,
        color: CHART_COLORS.palette[2],
      },
      {
        title: "FAR Achievement",
        subtitle: "Actual vs Target FAR",
        value: Math.round(actualFAR * 100),
        total: Math.round(targetFAR * 100) || 100,
        color: actualFAR >= targetFAR * 0.9 ? CHART_COLORS.positive : CHART_COLORS.warning,
      },
    ];
  }, [highLevelMetrics, actualFAR, targetFAR]);

  // Generate sample sparkline data based on value
  const generateSparkline = (value: number, trend: "up" | "down" | "stable" = "up") => {
    const base = value * 0.7;
    const range = value * 0.3;
    if (trend === "up") {
      return [0.6, 0.65, 0.7, 0.75, 0.85, 0.9, 1].map(m => base + range * m);
    } else if (trend === "down") {
      return [1, 0.95, 0.9, 0.85, 0.75, 0.7, 0.65].map(m => base + range * m);
    }
    return [0.8, 0.85, 0.82, 0.88, 0.85, 0.9, 0.87].map(m => base + range * m);
  };

  // All high-level metrics as KPI stats with tooltips and sparklines
  const allMetricsStats = useMemo<KPIStatCardProps[]>(() => {
    const variance = highLevelMetrics.variance || 0;
    const variancePercent = highLevelMetrics.approvedBudget
      ? ((variance / highLevelMetrics.approvedBudget) * 100).toFixed(1)
      : "0";
    const tooltips = SUMMARY_PAGE_CONTENT.metricTooltips;

    return [
      // Row 1 - Key metrics with teal theme
      {
        title: "Total GLA",
        value: highLevelMetrics.totalGLA,
        subtitle: "m²",
        tooltip: tooltips.totalGLA,
        sparklineData: generateSparkline(highLevelMetrics.totalGLA, "up"),
        colorTheme: "teal" as const,
      },
      {
        title: "FAR",
        value: highLevelMetrics.far?.toFixed(2) || "0",
        tooltip: tooltips.far,
        sparklineData: generateSparkline(highLevelMetrics.far * 100, "stable"),
        colorTheme: "teal" as const,
      },
      {
        title: "# Phases",
        value: highLevelMetrics.phases,
        tooltip: tooltips.phases,
        colorTheme: "teal" as const,
      },
      {
        title: "Plot Area",
        value: highLevelMetrics.plotArea,
        subtitle: "m²",
        tooltip: tooltips.plotArea,
        sparklineData: generateSparkline(highLevelMetrics.plotArea, "stable"),
        colorTheme: "teal" as const,
      },
      {
        title: "GFA",
        value: highLevelMetrics.gfa,
        subtitle: "m²",
        tooltip: tooltips.gfa,
        sparklineData: generateSparkline(highLevelMetrics.gfa, "up"),
        colorTheme: "teal" as const,
      },
      // Row 2 - Financial metrics
      {
        title: "Approved Budget",
        value: highLevelMetrics.approvedBudget,
        subtitle: "SAR",
        tooltip: tooltips.approvedBudget,
      },
      {
        title: "BUA For Parking",
        value: highLevelMetrics.buaForParking,
        subtitle: "m²",
        tooltip: tooltips.buaForParking,
      },
      {
        title: "Base Date",
        value: highLevelMetrics.baseDate || "—",
        tooltip: tooltips.baseDate,
      },
      {
        title: "Construction Cost (Hard)",
        value: highLevelMetrics.constructionCostHard,
        subtitle: "SAR",
        tooltip: tooltips.constructionCostHard,
        sparklineData: generateSparkline(highLevelMetrics.constructionCostHard, "up"),
      },
      {
        title: "Total BUA",
        value: highLevelMetrics.totalBUA,
        subtitle: "m²",
        tooltip: tooltips.totalBUA,
      },
      // Row 3 - Cost breakdown
      {
        title: "Built Assets Cost",
        value: highLevelMetrics.builtAssetsCost,
        subtitle: "SAR",
        tooltip: tooltips.builtAssetsCost,
        sparklineData: generateSparkline(highLevelMetrics.builtAssetsCost, "up"),
      },
      {
        title: "Total Construction Cost",
        value: highLevelMetrics.totalConstructionCost,
        subtitle: "SAR",
        tooltip: tooltips.totalConstructionCost,
        sparklineData: generateSparkline(highLevelMetrics.totalConstructionCost, "up"),
      },
      {
        title: "Plot Area (Buildings)",
        value: highLevelMetrics.totalPlotAreaForBuildings,
        subtitle: "m²",
        tooltip: tooltips.plotAreaBuildings,
      },
      {
        title: "Infra & PR Cost",
        value: highLevelMetrics.infraPRCost,
        subtitle: "SAR",
        tooltip: tooltips.infraPRCost,
      },
      {
        title: "Variance",
        value: variance,
        subtitle: "SAR",
        change: `${variancePercent}%`,
        changeType: variance >= 0 ? "positive" : "negative",
        trendType: variance >= 0 ? "up" : "down",
        tooltip: tooltips.variance,
        colorTheme: variance >= 0 ? "green" as const : "red" as const,
      },
    ];
  }, [highLevelMetrics]);

  return (
    <SuiteInnerShell
      crumb={<span className="font-semibold text-[#cdd6e6]">ioMaster</span>}
      search={navSearch}
      onSearch={setNavSearch}
      searchPlaceholder="Search masterplans, reports…"
      header={
        <SuiteInnerHeader
          title={<>Masterplan Summary - {masterplan.masterplanName}</>}
          actions={
            <SuiteButton variant="dark" href={`/costx/${masterplan.id}`}>
              <CloseIcon className="size-4" strokeWidth={2} />
              Close
            </SuiteButton>
          }
        />
      }
    >
      {/* Content */}
      <div className="space-y-8 p-4">
          {/* Section 1: Masterplan High Level Metrics */}
        <div className="space-y-4">
          <SectionHeader
            title={SUMMARY_PAGE_CONTENT.sections.masterplanHighLevel.title}
            description={SUMMARY_PAGE_CONTENT.sections.masterplanHighLevel.description}
          />
          <KPIStatGrid stats={allMetricsStats} columns={5} />
        </div>

        {/* Section 1.5: Key Performance Indicators */}
        <Accordion
          title="Key Performance Indicators"
          description="These gauges show progress toward key targets. Green indicates on-track performance, yellow suggests attention needed, and red highlights areas requiring immediate review."
          defaultOpen={false}
          badge="4 KPIs"
          badgeType="info"
          stats={[
            {
              label: "Budget",
              value: `${((highLevelMetrics.totalConstructionCost / (highLevelMetrics.approvedBudget || highLevelMetrics.totalConstructionCost)) * 100).toFixed(0)}%`,
              type: highLevelMetrics.totalConstructionCost <= (highLevelMetrics.approvedBudget || highLevelMetrics.totalConstructionCost) ? "success" : "error"
            },
            {
              label: "FAR",
              value: `${((actualFAR / (targetFAR || 1)) * 100).toFixed(0)}%`,
              type: actualFAR >= targetFAR * 0.9 ? "success" : "warning"
            },
            {
              label: "Hard Cost",
              value: `${((highLevelMetrics.constructionCostHard / highLevelMetrics.totalConstructionCost) * 100).toFixed(0)}%`,
              type: "info"
            },
            {
              label: "Built Assets",
              value: `${((highLevelMetrics.builtAssetsCost / highLevelMetrics.totalConstructionCost) * 100).toFixed(0)}%`,
              type: "default"
            },
          ]}
        >
          <RadialChartGrid charts={keyMetricsRadial} columns={4} />
          <InsightCard
            type={SUMMARY_PAGE_CONTENT.insights.kpiGauges.type}
            title={SUMMARY_PAGE_CONTENT.insights.kpiGauges.title}
            description={SUMMARY_PAGE_CONTENT.insights.kpiGauges.description}
          />
        </Accordion>

        {/* Section 2: Capex Breakdown Summary */}
        <Accordion
          title={SUMMARY_PAGE_CONTENT.sections.capexBreakdown.title}
          description={SUMMARY_PAGE_CONTENT.sections.capexBreakdown.description}
          defaultOpen={false}
          badge={`${buildingAssets.length + carParking.length + additionalAssets.length} Assets`}
          badgeType="info"
          stats={[
            { label: "Total Cost", value: `${(highLevelMetrics.totalConstructionCost / 1000000).toFixed(1)}M SAR`, type: "default" },
            { label: "Built Assets", value: `${(highLevelMetrics.builtAssetsCost / 1000000).toFixed(1)}M SAR`, type: "info" },
            { label: "Infra & PR", value: `${(highLevelMetrics.infraPRCost / 1000000).toFixed(1)}M SAR`, type: "default" },
          ]}
        >
          <CapexBreakdownSummary data={capexBreakdownData} />
        </Accordion>

        {/* Section 3: Cost Trend */}
        <Accordion
          title={SUMMARY_PAGE_CONTENT.sections.costTrend.title}
          description={SUMMARY_PAGE_CONTENT.sections.costTrend.description}
          defaultOpen={false}
          badge={`${phaseTimeline.length > 0 ? phaseTimeline.length : phases.length} Phases`}
          badgeType="info"
          stats={[
            { label: "Total Budget", value: `${(highLevelMetrics.totalConstructionCost / 1000000).toFixed(1)}M SAR`, type: "default" },
            { label: "Timeline", value: `${costTrendData.length} Periods`, type: "info" },
          ]}
        >
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <CostTrendChart data={costTrendData} height={350} showLegend={true} />
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricExplainer
              title={SUMMARY_PAGE_CONTENT.explainers.costTrend.title}
              explanation={SUMMARY_PAGE_CONTENT.explainers.costTrend.explanation}
              benchmark={SUMMARY_PAGE_CONTENT.explainers.costTrend.benchmark}
            />
            <InsightCard
              type={SUMMARY_PAGE_CONTENT.insights.costTrendTip.type}
              title={SUMMARY_PAGE_CONTENT.insights.costTrendTip.title}
              description={SUMMARY_PAGE_CONTENT.insights.costTrendTip.description}
            />
          </div>
        </Accordion>

        {/* Section 4: Area Analysis & FAR */}
        <Accordion
          title={SUMMARY_PAGE_CONTENT.sections.areaAnalysis.title}
          description={SUMMARY_PAGE_CONTENT.sections.areaAnalysis.description}
          defaultOpen={false}
          badge={actualFAR >= targetFAR * 0.9 ? "Optimized" : "Below Target"}
          badgeType={actualFAR >= targetFAR * 0.9 ? "success" : "warning"}
          stats={[
            { label: "Actual FAR", value: actualFAR.toFixed(2), type: actualFAR >= targetFAR * 0.9 ? "success" : "warning" },
            { label: "Target FAR", value: targetFAR.toFixed(2), type: "default" },
            { label: "Residential GFA", value: `${(residentialGFA / 1000).toFixed(0)}K m²`, type: "info" },
            { label: "Commercial GFA", value: `${(commercialGFA / 1000).toFixed(0)}K m²`, type: "info" },
          ]}
        >
          <AreaAnalysisMetrics
            residentialGFA={residentialGFA}
            far={actualFAR}
            commercialGFA={commercialGFA}
          />
          <DevelopmentEfficiencyCharts
            actualFAR={actualFAR}
            targetFAR={targetFAR}
            farByAssetClass={farByAssetClass}
            farByAssetType={farByAssetType}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricExplainer
              title={SUMMARY_PAGE_CONTENT.explainers.far.title}
              explanation={SUMMARY_PAGE_CONTENT.explainers.far.explanation}
              formula={SUMMARY_PAGE_CONTENT.explainers.far.formula}
              benchmark={SUMMARY_PAGE_CONTENT.explainers.far.benchmark}
            />
            <InsightCard
              type={actualFAR >= targetFAR * 0.9 ? "success" : "warning"}
              title={actualFAR >= targetFAR * 0.9
                ? SUMMARY_PAGE_CONTENT.insights.farWellOptimized.title
                : SUMMARY_PAGE_CONTENT.insights.farOptimization.title}
              description={actualFAR >= targetFAR * 0.9
                ? SUMMARY_PAGE_CONTENT.insights.farWellOptimized.description
                : SUMMARY_PAGE_CONTENT.insights.farOptimization.description}
            />
          </div>
        </Accordion>

        {/* Section 5: GFA Distribution */}
        <Accordion
          title={SUMMARY_PAGE_CONTENT.sections.gfaDistribution.title}
          description={SUMMARY_PAGE_CONTENT.sections.gfaDistribution.description}
          defaultOpen={false}
          badge="4 Charts"
          badgeType="info"
          stats={[
            { label: "Total GFA", value: `${(highLevelMetrics.gfa / 1000).toFixed(0)}K m²`, type: "default" },
            { label: "Asset Classes", value: `${gfaByAssetClass.length}`, type: "info" },
            { label: "Asset Types", value: `${gfaByAssetType.length}`, type: "info" },
            { label: "Typologies", value: `${gfaByTypology.length}`, type: "default" },
          ]}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <GFADistributionCharts
              gfaByAssetClass={gfaByAssetClass}
              gfaByAssetType={gfaByAssetType}
              gfaByTypology={gfaByTypology}
              gfaByPricePoint={gfaByPricePoint}
            />
          </div>
          <InsightCard
            type={SUMMARY_PAGE_CONTENT.insights.marketMix.type}
            title={SUMMARY_PAGE_CONTENT.insights.marketMix.title}
            description={SUMMARY_PAGE_CONTENT.insights.marketMix.description}
          />
        </Accordion>

        {/* Section 6: Cost Distribution */}
        <Accordion
          title={SUMMARY_PAGE_CONTENT.sections.costDistribution.title}
          description={SUMMARY_PAGE_CONTENT.sections.costDistribution.description}
          defaultOpen={false}
          badge="3 Charts"
          badgeType="info"
          stats={[
            { label: "By Class", value: `${costByAssetClass.length} Types`, type: "default" },
            { label: "By Phase", value: `${costByPhase.length} Phases`, type: "info" },
            { label: "By Type", value: `${costByAssetType.length} Types`, type: "default" },
          ]}
        >
          <CostAnalysisCharts
            costByAssetClass={costByAssetClass}
            costByPhase={costByPhase}
            costByAssetType={costByAssetType}
            phases={phases}
            assetClasses={assetClasses}
            assetTypes={assetTypes}
          />
          <InsightCard
            type={SUMMARY_PAGE_CONTENT.insights.costDrivers.type}
            title={SUMMARY_PAGE_CONTENT.insights.costDrivers.title}
            description={SUMMARY_PAGE_CONTENT.insights.costDrivers.description}
          />
        </Accordion>

        {/* Section 7: Cost Model Analysis */}
        <Accordion
          title={SUMMARY_PAGE_CONTENT.sections.costModelAnalysis.title}
          description={SUMMARY_PAGE_CONTENT.sections.costModelAnalysis.description}
          defaultOpen={false}
          badge="NRM Categories"
          badgeType="default"
          stats={[
            { label: "Categories", value: `${costModelData.length}`, type: "info" },
            { label: "Hard Cost", value: `${(highLevelMetrics.constructionCostHard / 1000000).toFixed(1)}M SAR`, type: "default" },
          ]}
        >
          <CostModelAnalysis
            data={costModelData}
            assetClasses={assetClasses}
            assetTypes={assetTypes}
          />
          <InsightCard
            type={SUMMARY_PAGE_CONTENT.insights.benchmarking.type}
            title={SUMMARY_PAGE_CONTENT.insights.benchmarking.title}
            description={SUMMARY_PAGE_CONTENT.insights.benchmarking.description}
          />
        </Accordion>

        {/* Section 8: Executive Summary */}
        <Accordion
          title={SUMMARY_PAGE_CONTENT.sections.executiveSummary.title}
          description={SUMMARY_PAGE_CONTENT.sections.executiveSummary.description}
          defaultOpen={false}
          badge={executiveSummary ? "Has Content" : "Empty"}
          badgeType={executiveSummary ? "success" : "warning"}
          stats={[
            { label: "Status", value: executiveSummary ? "Written" : "Pending", type: executiveSummary ? "success" : "warning" },
          ]}
        >
          <ExecutiveSummary
            summary={executiveSummary}
            onSave={onSaveExecutiveSummary}
            isEditable={true}
          />
        </Accordion>
      </div>
    </SuiteInnerShell>
  );
}
