/**
 * Derive NRM Level 1 on every rate item from its POMI section letter.
 *
 * Logic:
 *   1. Load /pomi_to_nrm_corrected.json (the project's authoritative
 *      POMI clause → NRM code bridge, derived from POMI_CODING_FINAL.xlsx
 *      LOOKUP_DATA).
 *   2. For each POMI section (A..R) take every bridge entry's nrm_default,
 *      strip to its first-segment ("1.01" → "1") and pick the dominant L1.
 *   3. Ensure every chosen L1 exists in rates_dim_nrm_l1.
 *   4. For each rate_item with a POMI section but no NRM L1, set the
 *      mapped L1.
 *
 *   USAGE
 *     cd web
 *     npx tsx scripts/derive-nrm-from-pomi.ts          # apply
 *     npx tsx scripts/derive-nrm-from-pomi.ts --dry    # report only
 *     npx tsx scripts/derive-nrm-from-pomi.ts --force  # also retag rows that already have an NRM L1
 */

import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";

const DRY   = process.argv.includes("--dry");
const FORCE = process.argv.includes("--force");

const BRIDGE_PATH = path.resolve(__dirname, "../../pomi_to_nrm_corrected.json");

// Canonical NRM L1 labels (RICS NRM2).
const NRM_L1_LABEL: Record<string, string> = {
  "0": "Unclassified",
  "1": "Substructure",
  "2": "Superstructure",
  "3": "Internal Finishes",
  "4": "Fittings, Furnishings and Equipment",
  "5": "Services",
  "6": "Prefabricated buildings",
  "7": "Work to existing buildings",
  "8": "External works",
  "9": "Facilitating works",
};

interface BridgeEntry {
  pomi_section: string;
  nrm_default: { code: string; description: string };
}
interface BridgeFile {
  entries: BridgeEntry[];
}

function fmt(n: number): string {
  return n.toLocaleString();
}

async function main() {
  const startedAt = Date.now();

  // ── 1. Load bridge
  if (!fs.existsSync(BRIDGE_PATH)) {
    throw new Error(`bridge file not found at ${BRIDGE_PATH}`);
  }
  const bridge = JSON.parse(fs.readFileSync(BRIDGE_PATH, "utf-8")) as BridgeFile;

  // ── 2. Dominant L1 per POMI section
  type Counts = Map<string, number>;
  const counts = new Map<string, Counts>();
  for (const e of bridge.entries) {
    const sec = (e.pomi_section ?? "").trim().toUpperCase().slice(0, 1);
    if (!sec) continue;
    const l1 = (e.nrm_default?.code ?? "").split(".")[0];
    if (!l1) continue;
    const c = counts.get(sec) ?? new Map<string, number>();
    c.set(l1, (c.get(l1) ?? 0) + 1);
    counts.set(sec, c);
  }
  const dominant: Record<string, string> = {};
  for (const [sec, c] of counts) {
    const top = [...c.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top) dominant[sec] = top[0];
  }
  console.log("Dominant NRM L1 per POMI section:");
  for (const s of Object.keys(dominant).sort()) {
    console.log(`   ${s} → ${dominant[s]}  ${NRM_L1_LABEL[dominant[s]] ?? ""}`);
  }
  console.log("");

  // ── 3. Ensure each dominant L1 code exists in rates_dim_nrm_l1
  const l1Codes = Array.from(new Set(Object.values(dominant)));
  const dimMap = new Map<string, string>();
  for (const code of l1Codes) {
    const row = await prisma.ratesDimNrmL1.upsert({
      where: { code },
      update: {},
      create: { code, label: NRM_L1_LABEL[code] ?? code },
      select: { id: true },
    });
    dimMap.set(code, row.id);
  }

  // ── 4. Pull rate items that have a POMI section, then update in groups
  const where = FORCE
    ? { pomiSectionId: { not: null } }
    : { pomiSectionId: { not: null }, nrmL1Id: null };

  // Pre-fetch POMI section id → code so we can group updates by L1.
  const pomiSections = await prisma.ratesDimPomiSection.findMany({
    select: { id: true, code: true },
  });
  const pomiIdToCode = new Map(pomiSections.map((p) => [p.id, p.code]));

  const stats: Record<string, number> = {};
  let scanned = 0;
  let updated = 0;
  let unmapped = 0;
  const PAGE = 1000;
  let lastId: string | null = null;

  while (true) {
    const batch = await prisma.ratesFactRateItem.findMany({
      where: lastId ? { ...where, id: { gt: lastId } } : where,
      select: { id: true, pomiSectionId: true },
      orderBy: { id: "asc" },
      take: PAGE,
    });
    if (batch.length === 0) break;
    lastId = batch[batch.length - 1].id;
    scanned += batch.length;

    // Group by target NRM L1 id.
    const byTargetL1 = new Map<string, string[]>();
    for (const row of batch) {
      const pomiCode = row.pomiSectionId
        ? pomiIdToCode.get(row.pomiSectionId)
        : undefined;
      if (!pomiCode) {
        unmapped++;
        continue;
      }
      const l1Code = dominant[pomiCode];
      if (!l1Code) {
        unmapped++;
        continue;
      }
      const targetId = dimMap.get(l1Code);
      if (!targetId) {
        unmapped++;
        continue;
      }
      stats[l1Code] = (stats[l1Code] ?? 0) + 1;
      const list = byTargetL1.get(targetId) ?? [];
      list.push(row.id);
      byTargetL1.set(targetId, list);
    }

    if (!DRY) {
      for (const [nrmL1Id, ids] of byTargetL1) {
        await prisma.ratesFactRateItem.updateMany({
          where: { id: { in: ids } },
          data: { nrmL1Id },
        });
        updated += ids.length;
      }
    } else {
      updated += Array.from(byTargetL1.values()).reduce((s, a) => s + a.length, 0);
    }

    process.stdout.write(
      `  · scanned ${scanned}  updated ${updated}  unmapped ${unmapped}\r`,
    );
  }
  process.stdout.write("\n");

  const tookSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log("");
  console.log("──────────────────────────────────────────────────────────────");
  console.log(`  Derive NRM L1 from POMI  (${tookSec}s, ${DRY ? "DRY RUN" : "applied"})`);
  console.log("──────────────────────────────────────────────────────────────");
  console.log(`  Rate items scanned : ${fmt(scanned)}`);
  console.log(`  Tagged with NRM L1 : ${fmt(updated)}`);
  console.log(`  Unmapped           : ${fmt(unmapped)}`);
  console.log("");
  console.log("  Hits per NRM L1:");
  for (const code of Object.keys(stats).sort()) {
    console.log(`    ${code}  ${(NRM_L1_LABEL[code] ?? "").padEnd(40)} ${fmt(stats[code])}`);
  }
  console.log("──────────────────────────────────────────────────────────────");
}

main()
  .catch((err) => {
    console.error("[derive-nrm] fatal:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
