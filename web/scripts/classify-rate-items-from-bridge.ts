/**
 * Classify rate items via the POMI_CODING_FINAL bridge.
 *
 * Walks every `rates_fact_rate_item`, tokenises its description, scores it
 * against every POMI clause description in
 * `/pomi_to_nrm_corrected.json` (TF-IDF cosine-ish), and tags it with the
 * best match's POMI section + NRM L1.
 *
 * Replaces the older keyword-regex classifier
 * (`scripts/classify-rate-items-pomi.ts`) which used hand-rolled patterns.
 * This script uses the project's authoritative bridge as the source of
 * truth — no magic keyword list.
 *
 *   USAGE
 *     cd web
 *     npx tsx scripts/classify-rate-items-from-bridge.ts          # apply
 *     npx tsx scripts/classify-rate-items-from-bridge.ts --dry    # report only
 *     npx tsx scripts/classify-rate-items-from-bridge.ts --reset  # clear existing tags first
 *     npx tsx scripts/classify-rate-items-from-bridge.ts --threshold 0.08
 */

import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";

const DRY   = process.argv.includes("--dry");
const RESET = process.argv.includes("--reset");
const thArgIdx = process.argv.indexOf("--threshold");
const THRESHOLD = thArgIdx >= 0 ? Number(process.argv[thArgIdx + 1]) : 0.08;

const BRIDGE_PATH = path.resolve(__dirname, "../../pomi_to_nrm_corrected.json");

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
  pomi_code: string;
  description: string;
  nrm_default: { code: string };
}

const STOP = new Set<string>(
  "a an the and or for of in on to from with by at as is are be been being has have had do does did was were will shall may might can could would should not no this that these those it its their they them all any each more most some such only than then else also etc into over under per".split(" "),
);

const TOKEN_RE = /[a-z][a-z0-9]+/g;

function tokenize(s: string): string[] {
  return (s.toLowerCase().match(TOKEN_RE) ?? []).filter(
    (t) => t.length > 2 && !STOP.has(t),
  );
}

function fmt(n: number): string {
  return n.toLocaleString();
}

async function main() {
  const t0 = Date.now();

  if (!fs.existsSync(BRIDGE_PATH)) throw new Error(`bridge not found at ${BRIDGE_PATH}`);
  const bridge = JSON.parse(fs.readFileSync(BRIDGE_PATH, "utf-8")) as {
    entries: BridgeEntry[];
  };

  // ── 1. Build TF-IDF index over bridge clauses ───────────────────────────
  type Indexed = {
    entry: BridgeEntry;
    tokens: Map<string, number>;       // token → tf
    norm: number;                       // sqrt(sum(tf^2 * idf^2))
    pomiCode1: string;                  // first letter A-R
  };

  const docs: Indexed[] = [];
  const df = new Map<string, number>();

  for (const e of bridge.entries) {
    const text = `${e.description ?? ""} ${e.pomi_code ?? ""}`;
    const tokens = tokenize(text);
    if (tokens.length === 0) continue;
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    docs.push({
      entry: e,
      tokens: tf,
      norm: 0,
      pomiCode1: (e.pomi_section ?? "").trim().toUpperCase().slice(0, 1),
    });
  }
  const N = docs.length;
  const idf = new Map<string, number>();
  for (const [t, d] of df) idf.set(t, Math.log((N + 1) / (d + 1)) + 1);

  for (const doc of docs) {
    let s = 0;
    for (const [t, tf] of doc.tokens) {
      const w = tf * (idf.get(t) ?? 0);
      s += w * w;
    }
    doc.norm = Math.sqrt(s) || 1;
  }
  console.log(`  Indexed ${N} POMI clauses · vocab ${idf.size} terms`);

  // ── 2. Ensure POMI sections + NRM L1 codes used by the bridge exist ─────
  const pomiSections = await prisma.ratesDimPomiSection.findMany({
    select: { id: true, code: true },
  });
  const pomiIdByCode = new Map(pomiSections.map((p) => [p.code, p.id]));

  const nrmL1Codes = new Set<string>();
  for (const e of bridge.entries) {
    const c = (e.nrm_default?.code ?? "").split(".")[0];
    if (c) nrmL1Codes.add(c);
  }
  const nrmIdByCode = new Map<string, string>();
  for (const code of nrmL1Codes) {
    const row = await prisma.ratesDimNrmL1.upsert({
      where: { code },
      update: {},
      create: { code, label: NRM_L1_LABEL[code] ?? code },
      select: { id: true },
    });
    nrmIdByCode.set(code, row.id);
  }

  // ── 3. Optionally clear previous tags so re-runs are clean ──────────────
  if (RESET && !DRY) {
    const r = await prisma.ratesFactRateItem.updateMany({
      data: { pomiSectionId: null, nrmL1Id: null },
      where: {},
    });
    console.log(`  Reset POMI/NRM on ${fmt(r.count)} rows`);
  }

  // ── 4. Walk rate items, score, update ───────────────────────────────────
  type StatBucket = { matched: number; unmatched: number };
  const perPomi: Record<string, number> = {};
  const perL1:   Record<string, number> = {};
  const overall: StatBucket = { matched: 0, unmatched: 0 };

  const PAGE = 500;
  let lastId: string | null = null;
  let scanned = 0;
  let applied = 0;

  while (true) {
    const batch = await prisma.ratesFactRateItem.findMany({
      where: lastId ? { id: { gt: lastId } } : {},
      select: { id: true, description: true },
      orderBy: { id: "asc" },
      take: PAGE,
    });
    if (batch.length === 0) break;
    lastId = batch[batch.length - 1].id;
    scanned += batch.length;

    // Group updates by (pomiSectionId, nrmL1Id) tuple.
    const byTuple = new Map<string, string[]>();
    for (const row of batch) {
      const text = row.description ?? "";
      const queryTokens = tokenize(text);
      if (queryTokens.length === 0) {
        overall.unmatched++;
        continue;
      }
      const qf = new Map<string, number>();
      for (const t of queryTokens) qf.set(t, (qf.get(t) ?? 0) + 1);
      let qNormSq = 0;
      for (const [t, f] of qf) {
        const w = f * (idf.get(t) ?? 0);
        qNormSq += w * w;
      }
      const qNorm = Math.sqrt(qNormSq) || 1;

      let bestDoc: Indexed | null = null;
      let bestScore = 0;

      for (const doc of docs) {
        // dot product
        let dot = 0;
        for (const [t, f] of qf) {
          const tf = doc.tokens.get(t);
          if (!tf) continue;
          const w = idf.get(t) ?? 0;
          dot += f * tf * w * w;
        }
        if (dot === 0) continue;
        const score = dot / (qNorm * doc.norm);
        if (score > bestScore) {
          bestScore = score;
          bestDoc = doc;
        }
      }

      if (!bestDoc || bestScore < THRESHOLD) {
        overall.unmatched++;
        continue;
      }

      const pomiCode = bestDoc.pomiCode1;
      const nrmL1 = (bestDoc.entry.nrm_default?.code ?? "").split(".")[0];
      const pomiId = pomiIdByCode.get(pomiCode);
      const nrmL1Id = nrmIdByCode.get(nrmL1);
      if (!pomiId || !nrmL1Id) {
        overall.unmatched++;
        continue;
      }

      overall.matched++;
      perPomi[pomiCode] = (perPomi[pomiCode] ?? 0) + 1;
      perL1[nrmL1] = (perL1[nrmL1] ?? 0) + 1;

      const key = `${pomiId}::${nrmL1Id}`;
      const list = byTuple.get(key) ?? [];
      list.push(row.id);
      byTuple.set(key, list);
    }

    if (!DRY) {
      for (const [key, ids] of byTuple) {
        const [pomiId, nrmL1Id] = key.split("::");
        await prisma.ratesFactRateItem.updateMany({
          where: { id: { in: ids } },
          data: { pomiSectionId: pomiId, nrmL1Id },
        });
        applied += ids.length;
      }
    } else {
      applied += Array.from(byTuple.values()).reduce((s, a) => s + a.length, 0);
    }

    process.stdout.write(
      `  · scanned ${scanned}  matched ${overall.matched}  unmatched ${overall.unmatched}\r`,
    );
  }
  process.stdout.write("\n");

  const tookSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log("");
  console.log("──────────────────────────────────────────────────────────────");
  console.log(`  Bridge classifier  (${tookSec}s · threshold ${THRESHOLD} · ${DRY ? "DRY RUN" : "applied"})`);
  console.log("──────────────────────────────────────────────────────────────");
  console.log(`  Rate items scanned : ${fmt(scanned)}`);
  console.log(`  Tagged             : ${fmt(applied)}  (${scanned > 0 ? ((applied / scanned) * 100).toFixed(1) : 0}%)`);
  console.log(`  Unmatched          : ${fmt(overall.unmatched)}`);
  console.log("");
  console.log("  Hits per POMI:");
  for (const c of Object.keys(perPomi).sort()) {
    console.log(`    ${c}  ${fmt(perPomi[c])}`);
  }
  console.log("");
  console.log("  Hits per NRM L1:");
  for (const c of Object.keys(perL1).sort()) {
    console.log(`    ${c}  ${(NRM_L1_LABEL[c] ?? "").padEnd(36)} ${fmt(perL1[c])}`);
  }
  console.log("──────────────────────────────────────────────────────────────");
}

main()
  .catch((err) => { console.error("[bridge] fatal:", err); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
