/**
 * IOX seed — CostX rate library + reference data.
 *
 * Loads:
 *   1. CostModelEntry        (~1.5k rows from data/costModelEntries.json)
 *   2. ParametricMatrix      (factor adjustments per NRM Lvl 1)
 *   3. CostFactor            (1Q25…4Q40 cost uplifts, default 1.0)
 *   4. Configuration         (density bands, parking ratios, S-curve, …)
 *   5. Mock user "Arjun Mehta" — the session IOX uses today.
 *
 * Skipped vs roshn's original:
 *   • Demo benchmark projects + demo masterplans — real flows create
 *     these in IOX, so we don't pre-fill them.
 *
 * Idempotent: each section checks an existing-count before inserting,
 * so re-running is safe.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

interface CostModelEntryRow {
  assetClass?: string;
  assetTypeL1?: string;
  assetFormL2?: string | null;
  pricePoint?: string | null;
  nrmLvl1: string;
  nrmLvl2?: string | null;
  nrmLvl3?: string | null;
  rcdcCostGfa?: number;
  benchmarkedCostGfa?: number | null;
  costBua?: number | null;
  costGia?: number | null;
  costGfa?: number | null;
  unitOfMeasurement?: string | null;
  sarPerUoM?: number | null;
  extraPath?: string;
}

async function main() {
  console.log("🌱 IOX seed starting…");

  // ── 1. CostModelEntry ──────────────────────────────────────────────
  console.log("\n📊 Cost Model Entries");
  const cmPath = join(process.cwd(), "data/costModelEntries.json");
  const cmCount = await prisma.costModelEntry.count();
  if (cmCount > 0) {
    console.log(`   ✓ Already seeded (${cmCount} entries) — skipping`);
  } else if (!existsSync(cmPath)) {
    console.log("   ⚠ data/costModelEntries.json not found — skipping");
  } else {
    const data: CostModelEntryRow[] = JSON.parse(readFileSync(cmPath, "utf-8"));
    console.log(`   Found ${data.length} entries in JSON`);
    const BATCH = 500;
    for (let i = 0; i < data.length; i += BATCH) {
      const batch = data.slice(i, i + BATCH);
      await prisma.costModelEntry.createMany({
        data: batch.map((e) => ({
          assetClass: e.assetClass || "",
          assetTypeL1: e.assetTypeL1 || "",
          assetFormL2: e.assetFormL2 ?? null,
          pricePoint: e.pricePoint ?? null,
          nrmLvl1: e.nrmLvl1,
          nrmLvl2: e.nrmLvl2 ?? null,
          nrmLvl3: e.nrmLvl3 ?? null,
          rcdcCostGfa: e.rcdcCostGfa ?? 0,
          benchmarkedCostGfa: e.benchmarkedCostGfa ?? null,
          costBua: e.costBua ?? null,
          costGia: e.costGia ?? null,
          costGfa: e.costGfa ?? null,
          unitOfMeasurement: e.unitOfMeasurement ?? null,
          sarPerUoM: e.sarPerUoM ?? null,
          extraPath: e.extraPath ?? "",
        })),
        skipDuplicates: true,
      });
    }
    const after = await prisma.costModelEntry.count();
    console.log(`   ✅ Seeded ${after} entries`);
  }

  // ── 2. ParametricMatrix ─────────────────────────────────────────────
  console.log("\n📐 Parametric Matrix");
  const pmCount = await prisma.parametricMatrix.count();
  if (pmCount > 0) {
    console.log(`   ✓ Already seeded (${pmCount} entries) — skipping`);
  } else {
    const parametricEntries = [
      // Facade Treatment — Low
      { nrmLvl1: "Substructure", parameter: "Facade Treatment", option: "Low", factor: 0.8 },
      { nrmLvl1: "Superstructure", parameter: "Facade Treatment", option: "Low", factor: 0.85 },
      { nrmLvl1: "Building External Envelope", parameter: "Facade Treatment", option: "Low", factor: 0.75 },
      { nrmLvl1: "Internal Walls & Doors", parameter: "Facade Treatment", option: "Low", factor: 0.9 },
      { nrmLvl1: "Internal Finishes", parameter: "Facade Treatment", option: "Low", factor: 0.85 },
      // Facade Treatment — High
      { nrmLvl1: "Substructure", parameter: "Facade Treatment", option: "High", factor: 1.2 },
      { nrmLvl1: "Superstructure", parameter: "Facade Treatment", option: "High", factor: 1.15 },
      { nrmLvl1: "Building External Envelope", parameter: "Facade Treatment", option: "High", factor: 1.3 },
      { nrmLvl1: "Internal Walls & Doors", parameter: "Facade Treatment", option: "High", factor: 1.1 },
      { nrmLvl1: "Internal Finishes", parameter: "Facade Treatment", option: "High", factor: 1.15 },
      // Glazing Percentage — Low
      { nrmLvl1: "Building External Envelope", parameter: "Glazing Percentage", option: "Low", factor: 0.7 },
      { nrmLvl1: "Internal Finishes", parameter: "Glazing Percentage", option: "Low", factor: 0.9 },
      // Glazing Percentage — Medium
      { nrmLvl1: "Building External Envelope", parameter: "Glazing Percentage", option: "Medium", factor: 1.0 },
      { nrmLvl1: "Internal Finishes", parameter: "Glazing Percentage", option: "Medium", factor: 1.0 },
      // Glazing Percentage — High
      { nrmLvl1: "Building External Envelope", parameter: "Glazing Percentage", option: "High", factor: 1.4 },
      { nrmLvl1: "Internal Finishes", parameter: "Glazing Percentage", option: "High", factor: 1.2 },
    ];
    await prisma.parametricMatrix.createMany({ data: parametricEntries });
    console.log(`   ✅ Seeded ${parametricEntries.length} entries`);
  }

  // ── 3. CostFactor — 1Q25 through 4Q40 ───────────────────────────────
  console.log("\n📅 Cost Factors (1Q25 → 4Q40)");
  const cfCount = await prisma.costFactor.count();
  if (cfCount > 0) {
    console.log(`   ✓ Already seeded (${cfCount} entries) — skipping`);
  } else {
    const costFactors: { baseDate: string; costUplift: number }[] = [];
    for (let y = 2025; y <= 2040; y++) {
      for (let q = 1; q <= 4; q++) {
        costFactors.push({
          baseDate: `${q}Q${String(y).slice(-2)}`,
          costUplift: 1.0,
        });
      }
    }
    await prisma.costFactor.createMany({ data: costFactors });
    console.log(`   ✅ Seeded ${costFactors.length} quarters`);
  }

  // ── 4. Configuration ────────────────────────────────────────────────
  console.log("\n⚙️  Configuration");
  const configCount = await prisma.configuration.count();
  if (configCount > 0) {
    console.log(`   ✓ Already seeded (${configCount} keys) — skipping`);
  } else {
    await prisma.configuration.createMany({
      data: [
        { key: "density_range_factor", value: { lowToUse: 0.465, midToUse: 1.5 } },
        { key: "cost_factor_settings", value: { referenceBaseDate: "1Q25", annualInflationRate: 2 } },
        { key: "infrastructure_split", value: { primary: 30, secondary: 70 } },
        {
          key: "parking_space",
          value: { standard: 2.5, compact: 2.3, accessible: 3.6, motorcycle: 1.2 },
        },
        {
          key: "parking_area_per_space",
          value: { onGrade: 35, basement: 45, podium: 35, separateStructure: 40 },
        },
        {
          key: "other_costs_defaults",
          value: { contingency: 5, authorityFees: 3, softCosts: 8 },
        },
        {
          key: "warning_thresholds",
          value: {
            contingencyMax: 15,
            contingencyTypicalMin: 3,
            contingencyTypicalMax: 10,
            authorityFeesMax: 10,
            authorityFeesTypicalMin: 2,
            authorityFeesTypicalMax: 5,
            softCostsMax: 15,
            softCostsTypicalMin: 5,
            softCostsTypicalMax: 12,
            totalOtherCostsMax: 30,
            balanceAreaMinPercent: 5,
          },
        },
        { key: "general_requirements_default", value: { percentage: 10 } },
        {
          key: "scurve_settings",
          value: {
            steepness: 10,
            midpoint: 0.5,
            defaultPhaseDuration: 36,
            minPhaseDuration: 6,
            maxPhaseDuration: 120,
          },
        },
      ],
    });
    console.log("   ✅ Seeded configuration keys");
  }

  // ── 5. Mock IOX user (Arjun Mehta) ──────────────────────────────────
  console.log("\n👤 Mock IOX user");
  const arjun = await prisma.user.upsert({
    where: { email: "arjun.mehta@iox.local" },
    update: {},
    create: {
      email: "arjun.mehta@iox.local",
      name: "Arjun Mehta",
      role: "ADMIN",
      department: "Project Management",
      isActive: true,
    },
  });
  console.log(`   ✓ Arjun Mehta (id=${arjun.id.slice(0, 8)}…) ready`);

  console.log("\n🎉 IOX seed complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
