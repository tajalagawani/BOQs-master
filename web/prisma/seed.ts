/**
 * IOX seed — CostX rate library + reference data + DEMO content.
 *
 * Loads (idempotent — each section gated):
 *   1. CostModelEntry        (~1.5k rows from data/costModelEntries.json)
 *   2. ParametricMatrix      (factor adjustments per NRM Lvl 1)
 *   3. CostFactor            (1Q25…4Q40 cost uplifts, default 1.0)
 *   4. Configuration         (density bands, parking ratios, S-curve, …)
 *   5. Mock user "Arjun Mehta" — the session IOX uses today.
 *   6. DEMO content (gated by Configuration key `demo_seed_v1`):
 *        • 9 additional users (varied roles + departments)
 *        • 22 benchmark projects across KSA + GCC with NRM data
 *        • 28 masterplans with phases, building costs, infra costs,
 *          team assignments, AND a saved v1 MasterplanVersion JSON so
 *          the /costx/[id]/summary route renders directly.
 *        • 120+ activity log entries
 *        • 14 BOQ runs (12 COMPLETE, 1 PROCESSING, 1 FAILED)
 *
 * Re-seed demo: DELETE FROM configurations WHERE key = 'demo_seed_v1';
 *               then `npm run db:seed`.
 */
import "dotenv/config";
import { PrismaClient, MasterplanStatus, UserRole, TeamRole, BoqRunStatus } from "@prisma/client";
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

// ── Deterministic PRNG (mulberry32) — seeded so re-runs are byte-identical ──
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(0x105eed);
const pick = <T>(arr: readonly T[]) => arr[Math.floor(rng() * arr.length)];
const between = (lo: number, hi: number) => lo + rng() * (hi - lo);
const intBetween = (lo: number, hi: number) => Math.floor(between(lo, hi + 1));
const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;

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
        { key: "parking_space", value: { standard: 2.5, compact: 2.3, accessible: 3.6, motorcycle: 1.2 } },
        { key: "parking_area_per_space", value: { onGrade: 35, basement: 45, podium: 35, separateStructure: 40 } },
        { key: "other_costs_defaults", value: { contingency: 5, authorityFees: 3, softCosts: 8 } },
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

  // ── 6. DEMO CONTENT (gated) ────────────────────────────────────────
  await seedDemoContent(arjun.id);

  console.log("\n🎉 IOX seed complete.");
}

// ═══════════════════════════════════════════════════════════════════════
// Demo content
// ═══════════════════════════════════════════════════════════════════════
async function seedDemoContent(arjunId: string) {
  console.log("\n🎨 Demo content");
  const gate = await prisma.configuration.findUnique({ where: { key: "demo_seed_v1" } });
  if (gate) {
    console.log("   ✓ demo_seed_v1 present — skipping (delete the row to re-seed)");
    return;
  }

  // ─── Users ─────────────────────────────────────────────────────────
  const teamData: Array<{
    email: string;
    name: string;
    role: UserRole;
    department: string;
  }> = [
    { email: "layla.alsaud@iox.local", name: "Layla Al-Saud", role: "DEVELOPMENT_MANAGER", department: "Real Estate Development" },
    { email: "khalid.alotaibi@iox.local", name: "Khalid Al-Otaibi", role: "DEVELOPMENT_MANAGER", department: "Infrastructure" },
    { email: "maya.hernandez@iox.local", name: "Maya Hernandez", role: "VIEWER", department: "Finance" },
    { email: "raj.patel@iox.local", name: "Raj Patel", role: "ADMIN", department: "Cost Management" },
    { email: "sara.alkhalifa@iox.local", name: "Sara Al-Khalifa", role: "DEVELOPMENT_MANAGER", department: "Master Planning" },
    { email: "yusuf.alghamdi@iox.local", name: "Yusuf Al-Ghamdi", role: "VIEWER", department: "Engineering" },
    { email: "aisha.alrashid@iox.local", name: "Aisha Al-Rashid", role: "DEVELOPMENT_MANAGER", department: "Asset Management" },
    { email: "daniel.park@iox.local", name: "Daniel Park", role: "VIEWER", department: "Quantity Surveying" },
    { email: "nora.alfaisal@iox.local", name: "Nora Al-Faisal", role: "ADMIN", department: "Strategy" },
  ];
  const users = [{ id: arjunId, name: "Arjun Mehta" }];
  for (const u of teamData) {
    const created = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, isActive: true },
    });
    users.push({ id: created.id, name: created.name || u.name });
  }
  console.log(`   👥 ${users.length} users ready`);

  // ─── Benchmark projects ───────────────────────────────────────────
  const NRM_CATEGORIES = [
    "Facilitating Works", "Substructure", "Superstructure",
    "Building External Envelope", "Internal Walls & Doors", "Internal Finishes",
    "FF&E", "Services Equipment", "Sanitary Fittings",
    "Mechanical Services", "Electrical Services", "External Works",
    "Conveying Systems", "General Requirements",
  ];

  const benchmarkProjects = [
    { name: "Diriyah Gate — Phase 1", city: "Riyadh", lat: 24.7370, lng: 46.5750, assetClass: "Mixed-Use", assetTypeL1: "Mixed-Use", assetFormL2: "Cultural District", developer: "Diriyah Gate Authority", gla: 320000, totalCost: 2_800_000_000 },
    { name: "King Salman Park", city: "Riyadh", lat: 24.7210, lng: 46.6750, assetClass: "Public Realm", assetTypeL1: "Park", assetFormL2: "Urban Park", developer: "Royal Commission for Riyadh", gla: 16_600_000, totalCost: 5_400_000_000 },
    { name: "NEOM The Line — Module 1", city: "NEOM", lat: 28.0700, lng: 35.0500, assetClass: "Mixed-Use", assetTypeL1: "Mixed-Use", assetFormL2: "Linear City", developer: "NEOM Company", gla: 240000, totalCost: 12_500_000_000 },
    { name: "Trojena Mountain Resort", city: "NEOM", lat: 28.4350, lng: 35.5800, assetClass: "Hospitality", assetTypeL1: "Resort", assetFormL2: "Ski Resort", developer: "NEOM Company", gla: 185000, totalCost: 8_900_000_000 },
    { name: "Sindalah Island", city: "NEOM", lat: 27.7100, lng: 35.2400, assetClass: "Hospitality", assetTypeL1: "Resort", assetFormL2: "Luxury Island", developer: "NEOM Company", gla: 92000, totalCost: 3_200_000_000 },
    { name: "Red Sea Project — Phase 1", city: "Tabuk", lat: 25.7000, lng: 36.5500, assetClass: "Hospitality", assetTypeL1: "Resort", assetFormL2: "Coastal Resort", developer: "Red Sea Global", gla: 158000, totalCost: 9_800_000_000 },
    { name: "AMAALA Triple Bay", city: "Tabuk", lat: 25.1800, lng: 37.2400, assetClass: "Hospitality", assetTypeL1: "Resort", assetFormL2: "Wellness Resort", developer: "Red Sea Global", gla: 145000, totalCost: 7_100_000_000 },
    { name: "Qiddiya Entertainment City", city: "Riyadh", lat: 24.4500, lng: 46.3000, assetClass: "Mixed-Use", assetTypeL1: "Entertainment", assetFormL2: "Theme District", developer: "Qiddiya Investment Co.", gla: 295000, totalCost: 14_200_000_000 },
    { name: "Six Flags Qiddiya", city: "Riyadh", lat: 24.4400, lng: 46.2900, assetClass: "Entertainment", assetTypeL1: "Theme Park", assetFormL2: "Theme Park", developer: "Qiddiya Investment Co.", gla: 38000, totalCost: 4_500_000_000 },
    { name: "AlUla Old Town Revitalisation", city: "AlUla", lat: 26.6100, lng: 37.9200, assetClass: "Cultural", assetTypeL1: "Cultural", assetFormL2: "Heritage Quarter", developer: "Royal Commission for AlUla", gla: 62000, totalCost: 1_900_000_000 },
    { name: "Sharaan Resort by Jean Nouvel", city: "AlUla", lat: 26.7100, lng: 37.8500, assetClass: "Hospitality", assetTypeL1: "Resort", assetFormL2: "Boutique Resort", developer: "Royal Commission for AlUla", gla: 28000, totalCost: 2_100_000_000 },
    { name: "Jeddah Central Project", city: "Jeddah", lat: 21.5410, lng: 39.1730, assetClass: "Mixed-Use", assetTypeL1: "Mixed-Use", assetFormL2: "Waterfront District", developer: "Public Investment Fund", gla: 410000, totalCost: 18_700_000_000 },
    { name: "King Abdullah Financial District", city: "Riyadh", lat: 24.7600, lng: 46.6420, assetClass: "Commercial", assetTypeL1: "Commercial Building", assetFormL2: "High Rise", developer: "PIF / Sumou Capital", gla: 525000, totalCost: 22_400_000_000 },
    { name: "Mukaab — New Murabba", city: "Riyadh", lat: 24.7050, lng: 46.6800, assetClass: "Mixed-Use", assetTypeL1: "Mixed-Use", assetFormL2: "Megastructure", developer: "New Murabba Development Co.", gla: 380000, totalCost: 25_000_000_000 },
    { name: "Roshn Sedra — North Riyadh", city: "Riyadh", lat: 24.8500, lng: 46.7100, assetClass: "Residential", assetTypeL1: "Multi Family", assetFormL2: "Low Rise", developer: "ROSHN", gla: 290000, totalCost: 6_800_000_000 },
    { name: "Roshn Warefa Community", city: "Riyadh", lat: 24.8300, lng: 46.5400, assetClass: "Residential", assetTypeL1: "Single Family", assetFormL2: "Villa", developer: "ROSHN", gla: 215000, totalCost: 5_200_000_000 },
    { name: "Marafy Canal District", city: "Jeddah", lat: 21.6500, lng: 39.1800, assetClass: "Mixed-Use", assetTypeL1: "Mixed-Use", assetFormL2: "Canal District", developer: "PIF", gla: 175000, totalCost: 7_800_000_000 },
    { name: "Yanbu Industrial Park Expansion", city: "Yanbu", lat: 24.0900, lng: 38.0600, assetClass: "Industrial", assetTypeL1: "Industrial", assetFormL2: "Light Industrial", developer: "Royal Commission for Jubail and Yanbu", gla: 460000, totalCost: 3_400_000_000 },
    { name: "Masdar City Phase 2", city: "Abu Dhabi", lat: 24.4280, lng: 54.6170, assetClass: "Mixed-Use", assetTypeL1: "Mixed-Use", assetFormL2: "Net-Zero District", developer: "Mubadala Investment", gla: 220000, totalCost: 4_900_000_000 },
    { name: "Lusail Marina Towers", city: "Doha", lat: 25.4170, lng: 51.4920, assetClass: "Residential", assetTypeL1: "Multi Family", assetFormL2: "High Rise", developer: "Qatari Diar", gla: 165000, totalCost: 6_400_000_000 },
    { name: "Madinat Jumeirah Living", city: "Dubai", lat: 25.1330, lng: 55.1860, assetClass: "Residential", assetTypeL1: "Multi Family", assetFormL2: "Mid Rise", developer: "Dubai Holding", gla: 95000, totalCost: 3_200_000_000 },
    { name: "Bahrain Bay Mixed-Use", city: "Manama", lat: 26.2520, lng: 50.5860, assetClass: "Mixed-Use", assetTypeL1: "Mixed-Use", assetFormL2: "Waterfront District", developer: "Bahrain Bay Development", gla: 140000, totalCost: 4_100_000_000 },
  ];

  const benchmarkRecords: { id: string; name: string }[] = [];
  for (const b of benchmarkProjects) {
    const owner = pick(users);
    const existing = await prisma.benchmarkProject.findFirst({ where: { name: b.name } });
    if (existing) {
      benchmarkRecords.push({ id: existing.id, name: existing.name });
      continue;
    }
    const totalGFA = b.gla * between(0.6, 1.0);
    const costPerGFA = b.totalCost / totalGFA;
    const created = await prisma.benchmarkProject.create({
      data: {
        name: b.name,
        assetClass: b.assetClass,
        assetTypeL1: b.assetTypeL1,
        assetFormL2: b.assetFormL2,
        location: b.city,
        country: ["Riyadh", "Jeddah", "NEOM", "Tabuk", "Yanbu", "AlUla"].includes(b.city) ? "Saudi Arabia" :
          b.city === "Abu Dhabi" || b.city === "Dubai" ? "United Arab Emirates" :
          b.city === "Doha" ? "Qatar" : b.city === "Manama" ? "Bahrain" : "Saudi Arabia",
        city: b.city,
        developer: b.developer,
        currency: "SAR",
        latitude: round(b.lat, 7),
        longitude: round(b.lng, 7),
        grossLandArea: round(b.gla, 2),
        totalCost: round(b.totalCost, 2),
        totalGFA: round(totalGFA, 2),
        costPerGFA: round(costPerGFA, 2),
        uploadedById: owner.id,
        source: pick(["Tendered", "Final Account", "Construction Estimate"]),
        nrmData: {
          create: NRM_CATEGORIES.map((cat) => {
            const baseShare = {
              "Facilitating Works": 0.03, "Substructure": 0.08, "Superstructure": 0.20,
              "Building External Envelope": 0.12, "Internal Walls & Doors": 0.07, "Internal Finishes": 0.10,
              "FF&E": 0.06, "Services Equipment": 0.04, "Sanitary Fittings": 0.02,
              "Mechanical Services": 0.08, "Electrical Services": 0.07, "External Works": 0.05,
              "Conveying Systems": 0.03, "General Requirements": 0.05,
            }[cat] ?? 0.05;
            const jitter = between(0.85, 1.15);
            const cost = (b.totalCost * baseShare * jitter) / totalGFA;
            return { nrmCategory: cat, costGfa: round(cost, 2) };
          }),
        },
      },
    });
    benchmarkRecords.push({ id: created.id, name: created.name });
  }
  console.log(`   📊 ${benchmarkRecords.length} benchmark projects ready`);

  // ─── Masterplans ──────────────────────────────────────────────────
  const masterplanTemplates = [
    { name: "Roshn Sedra District 3", assetClass: "Residential", assetTypeL1: "Multi Family", assetFormL2: "Mid Rise", country: "Saudi Arabia", developer: "ROSHN", status: "ACTIVE" as MasterplanStatus, gla: 480000 },
    { name: "Roshn Warefa Phase 2 Villas", assetClass: "Residential", assetTypeL1: "Single Family", assetFormL2: "Villa", country: "Saudi Arabia", developer: "ROSHN", status: "DRAFT" as MasterplanStatus, gla: 290000 },
    { name: "Diriyah West Gateway", assetClass: "Mixed-Use", assetTypeL1: "Mixed-Use", assetFormL2: "Cultural District", country: "Saudi Arabia", developer: "Diriyah Gate Authority", status: "ACTIVE" as MasterplanStatus, gla: 380000 },
    { name: "King Salman Park Cultural Quarter", assetClass: "Public Realm", assetTypeL1: "Park", assetFormL2: "Urban Park", country: "Saudi Arabia", developer: "Royal Commission for Riyadh", status: "APPROVED" as MasterplanStatus, gla: 850000 },
    { name: "NEOM The Line — Module 3", assetClass: "Mixed-Use", assetTypeL1: "Mixed-Use", assetFormL2: "Linear City", country: "Saudi Arabia", developer: "NEOM Company", status: "DRAFT" as MasterplanStatus, gla: 260000 },
    { name: "Trojena Lakes & Residences", assetClass: "Hospitality", assetTypeL1: "Resort", assetFormL2: "Mountain Resort", country: "Saudi Arabia", developer: "NEOM Company", status: "ACTIVE" as MasterplanStatus, gla: 195000 },
    { name: "Red Sea Resort Cluster 4", assetClass: "Hospitality", assetTypeL1: "Resort", assetFormL2: "Coastal Resort", country: "Saudi Arabia", developer: "Red Sea Global", status: "DRAFT" as MasterplanStatus, gla: 145000 },
    { name: "AMAALA Coastal Spa Village", assetClass: "Hospitality", assetTypeL1: "Resort", assetFormL2: "Wellness Resort", country: "Saudi Arabia", developer: "Red Sea Global", status: "DRAFT" as MasterplanStatus, gla: 110000 },
    { name: "Qiddiya Speed Park Quarter", assetClass: "Entertainment", assetTypeL1: "Theme Park", assetFormL2: "Motorsport District", country: "Saudi Arabia", developer: "Qiddiya Investment Co.", status: "ACTIVE" as MasterplanStatus, gla: 220000 },
    { name: "AlUla Cultural Oasis", assetClass: "Cultural", assetTypeL1: "Cultural", assetFormL2: "Heritage Quarter", country: "Saudi Arabia", developer: "Royal Commission for AlUla", status: "APPROVED" as MasterplanStatus, gla: 78000 },
    { name: "Jeddah Central Marina Edge", assetClass: "Mixed-Use", assetTypeL1: "Mixed-Use", assetFormL2: "Waterfront District", country: "Saudi Arabia", developer: "Public Investment Fund", status: "ACTIVE" as MasterplanStatus, gla: 320000 },
    { name: "KAFD Tower Cluster B", assetClass: "Commercial", assetTypeL1: "Commercial Building", assetFormL2: "High Rise", country: "Saudi Arabia", developer: "PIF / Sumou Capital", status: "DRAFT" as MasterplanStatus, gla: 410000 },
    { name: "Mukaab Adjacent Residential Towers", assetClass: "Residential", assetTypeL1: "Multi Family", assetFormL2: "High Rise", country: "Saudi Arabia", developer: "New Murabba Development Co.", status: "DRAFT" as MasterplanStatus, gla: 285000 },
    { name: "Marafy Waterfront Promenade", assetClass: "Public Realm", assetTypeL1: "Park", assetFormL2: "Waterfront Promenade", country: "Saudi Arabia", developer: "PIF", status: "ACTIVE" as MasterplanStatus, gla: 95000 },
    { name: "Yanbu Industrial Block 12", assetClass: "Industrial", assetTypeL1: "Industrial", assetFormL2: "Heavy Industrial", country: "Saudi Arabia", developer: "Royal Commission for Jubail and Yanbu", status: "ARCHIVED" as MasterplanStatus, gla: 380000 },
    { name: "Madinah Hijra Gateway", assetClass: "Mixed-Use", assetTypeL1: "Mixed-Use", assetFormL2: "Gateway District", country: "Saudi Arabia", developer: "Madinah Development Authority", status: "DRAFT" as MasterplanStatus, gla: 240000 },
    { name: "Dammam Corniche Residential", assetClass: "Residential", assetTypeL1: "Multi Family", assetFormL2: "Mid Rise", country: "Saudi Arabia", developer: "Eastern Province Development", status: "ACTIVE" as MasterplanStatus, gla: 165000 },
    { name: "Abha Mountain Retreat", assetClass: "Hospitality", assetTypeL1: "Resort", assetFormL2: "Mountain Resort", country: "Saudi Arabia", developer: "Soudah Development", status: "DRAFT" as MasterplanStatus, gla: 88000 },
    { name: "King Salman International Airport Hub", assetClass: "Commercial", assetTypeL1: "Commercial Building", assetFormL2: "Aviation", country: "Saudi Arabia", developer: "KSIA Development Co.", status: "ACTIVE" as MasterplanStatus, gla: 620000 },
    { name: "Ad-Diriyah Heritage Villas", assetClass: "Residential", assetTypeL1: "Single Family", assetFormL2: "Villa", country: "Saudi Arabia", developer: "Diriyah Gate Authority", status: "APPROVED" as MasterplanStatus, gla: 215000 },
    { name: "Riyadh Sports Boulevard West", assetClass: "Public Realm", assetTypeL1: "Park", assetFormL2: "Linear Park", country: "Saudi Arabia", developer: "Royal Commission for Riyadh", status: "ACTIVE" as MasterplanStatus, gla: 320000 },
    { name: "Soudah Sky Resort", assetClass: "Hospitality", assetTypeL1: "Resort", assetFormL2: "Mountain Resort", country: "Saudi Arabia", developer: "Soudah Development", status: "DRAFT" as MasterplanStatus, gla: 72000 },
    { name: "Knowledge Economic City Phase 3", assetClass: "Mixed-Use", assetTypeL1: "Mixed-Use", assetFormL2: "Education District", country: "Saudi Arabia", developer: "Knowledge Economic City Co.", status: "DRAFT" as MasterplanStatus, gla: 195000 },
    { name: "Dammam Tech Campus", assetClass: "Commercial", assetTypeL1: "Commercial Building", assetFormL2: "Office Campus", country: "Saudi Arabia", developer: "Aramco Development", status: "ACTIVE" as MasterplanStatus, gla: 240000 },
    { name: "Hejaz Railway Station District", assetClass: "Mixed-Use", assetTypeL1: "Mixed-Use", assetFormL2: "Transit Oriented", country: "Saudi Arabia", developer: "Saudi Railway Co.", status: "DRAFT" as MasterplanStatus, gla: 175000 },
    { name: "Jeddah Old Town Adaptive Reuse", assetClass: "Cultural", assetTypeL1: "Cultural", assetFormL2: "Heritage Quarter", country: "Saudi Arabia", developer: "Jeddah Historic District Programme", status: "ARCHIVED" as MasterplanStatus, gla: 65000 },
    { name: "AlUla Wadi Residences", assetClass: "Residential", assetTypeL1: "Single Family", assetFormL2: "Villa", country: "Saudi Arabia", developer: "Royal Commission for AlUla", status: "DRAFT" as MasterplanStatus, gla: 130000 },
    { name: "NEOM Bay Workforce Housing", assetClass: "Residential", assetTypeL1: "Multi Family", assetFormL2: "Low Rise", country: "Saudi Arabia", developer: "NEOM Company", status: "ACTIVE" as MasterplanStatus, gla: 245000 },
  ];

  const phaseNames = ["Phase 1", "Phase 2", "Phase 3", "Phase 4"];
  const quarters = ((): string[] => {
    const out: string[] = [];
    for (let y = 26; y <= 32; y++) for (let q = 1; q <= 4; q++) out.push(`${q}Q${String(y).padStart(2, "0")}`);
    return out;
  })();

  let mpCreated = 0;
  let mpSkipped = 0;
  const masterplanIds: string[] = [];
  const now = Date.now();

  for (let i = 0; i < masterplanTemplates.length; i++) {
    const t = masterplanTemplates[i];

    const existing = await prisma.masterplan.findFirst({ where: { name: t.name } });
    if (existing) {
      masterplanIds.push(existing.id);
      mpSkipped++;
      continue;
    }

    const creator = pick(users);
    const numPhases = intBetween(1, 3);
    const plotRatio = between(0.55, 0.80);
    const calculatedPlotArea = t.gla * plotRatio;
    const balanceExternalArea = t.gla - calculatedPlotArea;

    // Rough total: per-m² SAR by asset class
    const sarPerM2Map: Record<string, number> = {
      Residential: 4500, Commercial: 6800, "Mixed-Use": 7200, Hospitality: 9500,
      Cultural: 8200, Entertainment: 11000, Industrial: 2200, "Public Realm": 1800,
    };
    const sarPerM2 = (sarPerM2Map[t.assetClass] ?? 5000) * between(0.85, 1.15);
    const constructionCost = calculatedPlotArea * sarPerM2;
    const contingencyAmt = constructionCost * 0.05;
    const totalCost = constructionCost + contingencyAmt + constructionCost * 0.11; // contingency + auth fees + soft
    const costPerGfa = totalCost / Math.max(1, t.gla);
    const totalUnits = t.assetClass === "Residential" ? intBetween(80, 800) : intBetween(0, 250);
    const parkingSpaces = intBetween(50, Math.max(200, totalUnits * 2));

    const benchmark = rng() < 0.6 ? pick(benchmarkRecords) : null;
    const phasesData = Array.from({ length: numPhases }, (_, idx) => ({
      phaseNumber: idx + 1,
      phaseName: phaseNames[idx],
      startDate: pick(quarters),
      totalMonths: intBetween(18, 60),
    }));

    // Building cost rows across all NRM Lvl 1 categories
    const buildingCostsData = NRM_CATEGORIES.map((cat) => {
      const share = {
        "Facilitating Works": 0.03, "Substructure": 0.08, "Superstructure": 0.20,
        "Building External Envelope": 0.12, "Internal Walls & Doors": 0.07, "Internal Finishes": 0.10,
        "FF&E": 0.06, "Services Equipment": 0.04, "Sanitary Fittings": 0.02,
        "Mechanical Services": 0.08, "Electrical Services": 0.07, "External Works": 0.05,
        "Conveying Systems": 0.03, "General Requirements": 0.05,
      }[cat] ?? 0.05;
      const catTotal = constructionCost * share * between(0.9, 1.1);
      return {
        nrmLvl1: cat,
        costGfa: round(catTotal / Math.max(1, t.gla), 2),
        costPlotArea: round(catTotal / Math.max(1, calculatedPlotArea), 2),
        totalCost: round(catTotal, 2),
      };
    });

    const infrastructureCostsData = [
      { category: "Primary Infrastructure", description: "Spine roads, utilities backbone", cost: round(balanceExternalArea * between(280, 420), 2) },
      { category: "Secondary Infrastructure", description: "Distribution, internal roads", cost: round(balanceExternalArea * between(180, 320), 2) },
      { category: "External Works", description: "Hardscape, signage, gates", cost: round(balanceExternalArea * between(80, 160), 2) },
    ];

    const createdAtOffset = intBetween(0, 180) * 24 * 60 * 60 * 1000;
    const createdAt = new Date(now - createdAtOffset);

    const mp = await prisma.masterplan.create({
      data: {
        name: t.name,
        description: `${t.developer} — ${t.assetClass} masterplan (${t.assetFormL2}).`,
        grossLandArea: round(t.gla, 2),
        calculatedPlotArea: round(calculatedPlotArea, 2),
        balanceExternalArea: round(balanceExternalArea, 2),
        totalUnits,
        parkingSpaces,
        contingency: round(contingencyAmt, 2),
        totalCost: round(totalCost, 2),
        costPerGfa: round(costPerGfa, 2),
        assetClass: t.assetClass,
        assetTypeL1: t.assetTypeL1,
        assetFormL2: t.assetFormL2,
        status: t.status,
        version: 1,
        createdById: creator.id,
        numberOfPhases: numPhases,
        benchmarkProjectId: benchmark?.id ?? null,
        country: t.country,
        developer: t.developer,
        isPublic: rng() < 0.3,
        createdAt,
        updatedAt: createdAt,
        phases: { create: phasesData },
        buildingCosts: { create: buildingCostsData },
        infrastructureCosts: { create: infrastructureCostsData },
      },
    });

    // Team members: 2-5
    const memberCount = intBetween(2, 5);
    const seen = new Set<string>([creator.id]);
    for (let k = 0; k < memberCount; k++) {
      const m = pick(users);
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      await prisma.projectTeamMember.create({
        data: {
          masterplanId: mp.id,
          userId: m.id,
          role: rng() < 0.3 ? TeamRole.MANAGER : TeamRole.VIEWER,
          assignedBy: creator.id,
        },
      }).catch(() => null);
    }

    // ── Saved v1 MasterplanVersion JSON so summary route renders ──
    const v1Quarter = phasesData[0].startDate;
    const buildingAssetCount = intBetween(2, 5);
    const buildingAssets = Array.from({ length: buildingAssetCount }, (_, idx) => {
      const phaseN = (idx % numPhases) + 1;
      const plotPer = round(between(2500, 9000), 2);
      const gfaPer = round(plotPer * between(1.8, 3.5), 2);
      const numB = intBetween(3, 18);
      const totalPlotArea = round(plotPer * numB, 2);
      const totalGFA = round(gfaPer * numB, 2);
      const sarRate = round(sarPerM2 * between(0.85, 1.15), 2);
      const netBuildCost = round(totalGFA * sarRate, 2);
      const finalCost = round(netBuildCost * 1.1, 2);
      return {
        id: `ba-${mp.id.slice(0, 6)}-${idx}`,
        assetClass: t.assetClass,
        assetTypeL1: t.assetTypeL1,
        assetTypologyL2: t.assetFormL2 ?? "Standard",
        pricePoint: pick(["Basic", "Premium", "Signature", "Luxury (Club)"]),
        phase: `Phase ${phaseN}`,
        baseDate: v1Quarter,
        plotAreaPerBuilding: plotPer,
        gfaPerBuilding: gfaPer,
        numberOfBuildings: numB,
        levels: intBetween(2, 28),
        generalRequirements: 10,
        totalPlotArea, totalGFA,
        far: round(totalGFA / Math.max(1, totalPlotArea), 3),
        buildingFootprint: round(totalPlotArea * 0.45, 2),
        externalArea: round(totalPlotArea * 0.35, 2),
        sarPerM2GFA: sarRate,
        netBuildCost,
        sarPerM2Total: round(finalCost / Math.max(1, totalGFA), 2),
        totalCost: netBuildCost,
        glazingPercentage: pick(["Low", "Medium", "High"]),
        finalCost,
      };
    });

    const carParking = [
      {
        id: `cp-${mp.id.slice(0, 6)}-0`,
        assetClass: "Car Parking",
        assetGroup: t.assetTypeL1,
        assetTypology: pick(["Basement", "On Grade", "Podium", "Separate Structure"]),
        phase: "Phase 1",
        baseDate: v1Quarter,
        parkingAreaPerSpace: 35,
        spacesPerLevel: intBetween(60, 240),
        numberOfBuildings: intBetween(1, 4),
        levels: intBetween(1, 2),
        generalRequirements: 10,
        facadeAdjustment: "Medium",
        totalParkingSpaces: parkingSpaces,
        totalPlotArea: round(parkingSpaces * 35, 2),
        totalParkingArea: round(parkingSpaces * 35, 2),
        sarPerM2: 1850,
        netBuildCost: round(parkingSpaces * 35 * 1850, 2),
        totalCost: round(parkingSpaces * 35 * 1850, 2),
        finalCost: round(parkingSpaces * 35 * 1850 * 1.1, 2),
      },
    ];

    const additionalAssets = Array.from({ length: intBetween(1, 3) }, (_, idx) => ({
      id: `aa-${mp.id.slice(0, 6)}-${idx}`,
      assetClass: "Additional Asset",
      assetGroup: pick(["Amenities", "Civic", "Logistics"]),
      assetTypeL1: pick(["Clubhouse", "Mosque", "School", "Health Centre"]),
      assetTypologyL2: pick(["Standard", "Premium"]),
      pricePoints: "Standard",
      calculationType: rng() < 0.5 ? "Lump Sum" : "Per m²",
      phase: `Phase ${intBetween(1, numPhases)}`,
      baseDate: v1Quarter,
      plotArea: round(between(800, 6000), 2),
      quantity: intBetween(1, 4),
      sarPerM2GFA: round(between(3000, 9500), 2),
      netBuildCost: round(between(2_000_000, 18_000_000), 2),
      generalRequirements: 10,
      totalCost: round(between(2_500_000, 22_000_000), 2),
    }));

    const publicRealm = Array.from({ length: intBetween(1, 2) }, (_, idx) => {
      const parkArea = round(between(2000, 15000), 2);
      const numParks = intBetween(1, 4);
      const totalParkArea = round(parkArea * numParks, 2);
      const rate = round(between(900, 2600), 2);
      const netBuild = round(totalParkArea * rate, 2);
      return {
        id: `pr-${mp.id.slice(0, 6)}-${idx}`,
        assetClass: "Public Realm",
        assetTypeL1: "Public Realm",
        assetTypologyL2: pick(["Pocket Park", "Plaza", "Linear Park", "Promenade"]),
        pricePoint: pick(["Standard", "Premium"]),
        phase: `Phase ${intBetween(1, numPhases)}`,
        parkArea,
        numberOfParks: numParks,
        generalRequirements: 10,
        totalParkArea,
        sarPerM2: rate,
        netBuildCost: netBuild,
        totalCost: round(netBuild * 1.1, 2),
      };
    });

    const infraTotalGla = round(balanceExternalArea, 2);
    const sarPerM2GLA = round(between(240, 380), 2);
    const infraNet = round(infraTotalGla * sarPerM2GLA, 2);
    const infrastructure = {
      baseDate: v1Quarter,
      assetDensity: pick(["Low", "Medium", "High"]),
      grossLandArea: round(t.gla, 2),
      totalPlotArea: round(calculatedPlotArea, 2),
      totalGLA: infraTotalGla,
      grossFAR: round(t.gla === 0 ? 0 : (calculatedPlotArea * 2.2) / t.gla, 3),
      phase: "Phase 1",
      balanceExternalArea: round(balanceExternalArea, 2),
      sarPerM2GLA,
      primaryCost: round(infraNet * 0.3, 2),
      secondaryCost: round(infraNet * 0.7, 2),
      generalRequirements: 10,
      netInfrastructureCost: infraNet,
      totalInfrastructureCost: round(infraNet * 1.1, 2),
    };

    const otherCosts = {
      contingencyPercentage: 5,
      authorityFeesPercentage: 3,
      softCostsPercentage: 8,
      contingencyAmount: round(constructionCost * 0.05, 2),
      authorityFeesAmount: round(constructionCost * 0.03, 2),
      softCostsAmount: round(constructionCost * 0.08, 2),
    };

    const version = {
      id: "v1",
      masterplanId: mp.id,
      versionName: "Initial estimate",
      versionNumber: 1,
      buildingAssets,
      carParking,
      additionalAssets,
      infrastructure,
      publicRealm,
      otherCosts,
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    };

    await prisma.configuration.create({
      data: {
        key: `masterplan_version_${mp.id}_v1`,
        value: version as unknown as object,
      },
    });

    masterplanIds.push(mp.id);
    mpCreated++;
  }
  console.log(`   🏗  Masterplans: ${mpCreated} created, ${mpSkipped} pre-existing (with v1 version JSON for each new one)`);

  // ─── Activity log ─────────────────────────────────────────────────
  const existingLogs = await prisma.activityLog.count();
  if (existingLogs > 0) {
    console.log(`   📜 Activity logs already present (${existingLogs}) — skipping`);
  } else {
    const actions = ["CREATE_MASTERPLAN", "UPDATE_MASTERPLAN", "ADD_TEAM_MEMBER", "UPDATE_VERSION", "EXPORT_REPORT", "VIEW_SUMMARY", "UPLOAD_BENCHMARK", "RUN_BOQ"];
    const entries = Array.from({ length: 140 }, (_, i) => {
      const u = pick(users);
      const a = pick(actions);
      const ms = i * 1000 * 60 * intBetween(20, 200);
      return {
        userId: u.id,
        action: a,
        entityType: a.includes("MASTERPLAN") ? "Masterplan" : a.includes("BENCHMARK") ? "BenchmarkProject" : a.includes("BOQ") ? "BoqRun" : "Masterplan",
        entityId: masterplanIds.length ? pick(masterplanIds) : null,
        createdAt: new Date(now - ms),
      };
    });
    await prisma.activityLog.createMany({ data: entries });
    console.log(`   📜 ${entries.length} activity log entries`);
  }

  // ─── BOQ runs ─────────────────────────────────────────────────────
  const boqFiles = [
    "Citywalk Plot 5.11 Main Works Contract BOQ.xlsx",
    "Townhouse A R2 Package 3 Bill 3.xlsx",
    "Diriyah Heritage Villas BoQ Tender.xlsx",
    "AlUla Visitor Centre Civils BoQ.xlsx",
    "Roshn Sedra D3 Substructure.xlsx",
    "Trojena Cable Car Station BoQ.xlsx",
    "Red Sea Resort 4 MEP Schedule.xlsx",
    "KAFD Tower B Facade Package.xlsx",
    "Madinah Hijra Gateway Civils.xlsx",
    "Yanbu Block 12 Industrial Slab.xlsx",
    "Soudah Sky Resort Pkg 2.xlsx",
    "King Salman Park Hardscape.xlsx",
    "Mukaab Adjacent Towers Site Works.xlsx",
    "Sharaan Resort Phase 1 Tender.xlsx",
  ];
  const boqRunIds = boqFiles.map((_, i) => `run-${(i + 1).toString().padStart(3, "0")}-${Math.floor(rng() * 1e6).toString(36)}`);
  let boqCreated = 0;
  for (let i = 0; i < boqFiles.length; i++) {
    const id = boqRunIds[i];
    const name = boqFiles[i].replace(/\.xlsx$/, "");
    const existing = await prisma.boqRun.findUnique({ where: { id } });
    if (existing) continue;
    const ageMs = intBetween(1, 60) * 24 * 60 * 60 * 1000;
    const createdAt = new Date(now - ageMs);
    const status: BoqRunStatus = i === boqFiles.length - 1 ? "PROCESSING" : i === boqFiles.length - 2 ? "FAILED" : "COMPLETE";
    await prisma.boqRun.create({
      data: {
        id,
        name,
        fileName: boqFiles[i],
        // Demo runs have no on-disk xlsx — leave sourceFile null so the
        // project page falls back to the demo data without trying (and
        // failing) to load a file. Real uploads set this themselves.
        sourceFile: null,
        status,
        createdById: pick(users).id,
        createdAt,
        completedAt: status === "COMPLETE" ? new Date(createdAt.getTime() + 60_000 * intBetween(2, 25)) : null,
      },
    });
    boqCreated++;
  }
  console.log(`   📦 BOQ runs: ${boqCreated} created`);

  // ─── Gate flag ────────────────────────────────────────────────────
  await prisma.configuration.create({
    data: {
      key: "demo_seed_v1",
      value: {
        seededAt: new Date().toISOString(),
        masterplans: mpCreated,
        benchmarkProjects: benchmarkRecords.length,
        users: users.length,
        boqRuns: boqCreated,
      },
    },
  });
  console.log("   ✅ demo_seed_v1 gate written");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
