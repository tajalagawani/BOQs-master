/**
 * Rates v2 — dimension findOrCreate helpers.
 *
 * Every loader (rates / benchmarks / design-ratios / materials) takes raw
 * text values from spreadsheets and needs to resolve them to dimension row
 * IDs. These helpers do exactly that:
 *
 *   1. Normalize the raw input (trim, casing, ISO codes for currencies, …).
 *   2. Look up an existing row.
 *   3. If missing, create one.
 *   4. Return { id, label, … }.
 *
 * Each helper accepts an optional `DimCache` so a single upload run does
 * not hammer Postgres for the same value over and over again. Pass one
 * cache instance for the whole load; helpers will reuse resolved IDs.
 *
 * Pattern: pure helpers, no implicit IO outside of the prisma calls.
 */

import { prisma } from "@/lib/prisma";

/* ──────────────────────────── Cache type ─────────────────────────── */

/**
 * Per-upload memoization. Build with `createDimCache()` once at the top
 * of a load and pass it to every helper.
 */
export interface DimCache {
  section:        Map<string, string>;
  tab:            Map<string, string>;
  country:        Map<string, string>;
  city:           Map<string, string>;
  currency:       Map<string, string>;
  uom:            Map<string, string>;
  assetClass:     Map<string, string>;
  assetType:      Map<string, string>;
  assetForm:      Map<string, string>;
  employer:       Map<string, string>;
  contractor:     Map<string, string>;
  contractType:   Map<string, string>;
  status:         Map<string, string>;
  project:        Map<string, string>;
  pomiSection:    Map<string, string>;
  pomiSubSection: Map<string, string>;
  nrmL1:          Map<string, string>;
  nrmL2:          Map<string, string>;
  nrmL3:          Map<string, string>;
  cesmmRef:       Map<string, string>;
  csiCode:        Map<string, string>;
  material:       Map<string, string>;
  mepSystem:      Map<string, string>;
  mepSubsystem:   Map<string, string>;
}

export function createDimCache(): DimCache {
  return {
    section: new Map(),         tab: new Map(),
    country: new Map(),         city: new Map(),
    currency: new Map(),        uom: new Map(),
    assetClass: new Map(),      assetType: new Map(),    assetForm: new Map(),
    employer: new Map(),        contractor: new Map(),
    contractType: new Map(),    status: new Map(),
    project: new Map(),
    pomiSection: new Map(),     pomiSubSection: new Map(),
    nrmL1: new Map(),           nrmL2: new Map(),        nrmL3: new Map(),
    cesmmRef: new Map(),        csiCode: new Map(),
    material: new Map(),
    mepSystem: new Map(),       mepSubsystem: new Map(),
  };
}

/* ─────────────────────────── Normalizers ─────────────────────────── */

const clean = (s: string | null | undefined): string =>
  (s ?? "").replace(/\s+/g, " ").trim();

/** Case-insensitive normalization for cache keys + label-style lookups. */
const ci = (s: string | null | undefined): string => clean(s).toLowerCase();

/** ISO-style strict normalization: uppercase, alphanumeric only. */
const iso = (s: string | null | undefined): string =>
  clean(s).toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * Map common unit spellings to the canonical code stored in `rates_dim_uom`.
 * Anything we don't recognise gets stored as-is (lowercased) so we still
 * persist it — operators can clean it up later.
 */
const UOM_ALIASES: Record<string, string> = {
  "m2": "m2", "m²": "m2", "sqm": "m2", "sq m": "m2", "sq. m": "m2",
  "m3": "m3", "m³": "m3", "cbm": "m3", "cu m": "m3", "cum": "m3",
  "m":  "m",  "meter": "m", "metre": "m",
  "lm": "lm", "lin m": "lm", "linear m": "lm", "rm": "lm", "running m": "lm",
  "km": "km",
  "kg": "kg", "kilogram": "kg", "kgs": "kg",
  "t":  "t",  "tonne": "t", "tonnes": "t", "tn": "t", "metric ton": "t",
  "nr": "nr", "no": "nr", "no.": "nr", "number": "nr", "nos": "nr", "nos.": "nr", "each": "nr", "ea": "nr",
  "set": "set",
  "item": "item",
  "hr": "hr", "hour": "hr", "hours": "hr", "h": "hr",
  "day": "day", "days": "day", "d": "day",
  "lot": "lot",
  "ls": "ls", "lump sum": "ls", "lump-sum": "ls",
};
function normalizeUnit(raw: string): string {
  const k = ci(raw).replace(/[\.\s]+$/g, "");
  return UOM_ALIASES[k] ?? k;
}

/* ─────────────────────────── Section + Tab ───────────────────────── */

export async function findOrCreateSection(
  code: string,
  label: string | undefined,
  cache: DimCache,
): Promise<string> {
  const key = ci(code);
  const hit = cache.section.get(key);
  if (hit) return hit;

  const row = await prisma.ratesDimSection.upsert({
    where: { code: key },
    update: { label: clean(label) || code },
    create: { code: key, label: clean(label) || code },
    select: { id: true },
  });
  cache.section.set(key, row.id);
  return row.id;
}

export async function findOrCreateTab(
  sectionCode: string,
  label: string,
  cache: DimCache,
): Promise<string> {
  const key = `${ci(sectionCode)}::${ci(label)}`;
  const hit = cache.tab.get(key);
  if (hit) return hit;

  const sectionId = await findOrCreateSection(sectionCode, undefined, cache);
  const cleaned = clean(label);
  const existing = await prisma.ratesDimTab.findUnique({
    where: { sectionId_label: { sectionId, label: cleaned } },
    select: { id: true },
  });
  const row =
    existing ??
    (await prisma.ratesDimTab.create({
      data: { sectionId, label: cleaned },
      select: { id: true },
    }));
  cache.tab.set(key, row.id);
  return row.id;
}

/* ────────────────────────── Geo: country + city ───────────────────── */

export async function findOrCreateCountry(
  name: string,
  cache: DimCache,
  opts?: { iso2?: string; iso3?: string },
): Promise<string> {
  const cleaned = clean(name);
  if (!cleaned) throw new Error("country name is required");
  const key = ci(cleaned);
  const hit = cache.country.get(key);
  if (hit) return hit;

  const existing = await prisma.ratesDimCountry.findFirst({
    where: { name: { equals: cleaned, mode: "insensitive" } },
    select: { id: true },
  });
  const row =
    existing ??
    (await prisma.ratesDimCountry.create({
      data: {
        name: cleaned,
        iso2: opts?.iso2 ? iso(opts.iso2).slice(0, 2) : null,
        iso3: opts?.iso3 ? iso(opts.iso3).slice(0, 3) : null,
      },
      select: { id: true },
    }));
  cache.country.set(key, row.id);
  return row.id;
}

export async function findOrCreateCity(
  name: string,
  countryName: string | null | undefined,
  cache: DimCache,
): Promise<string> {
  const cleanedName = clean(name);
  if (!cleanedName) throw new Error("city name is required");
  const countryId = countryName
    ? await findOrCreateCountry(countryName, cache)
    : null;
  const key = `${countryId ?? "_"}::${ci(cleanedName)}`;
  const hit = cache.city.get(key);
  if (hit) return hit;

  const existing = countryId
    ? await prisma.ratesDimCity.findUnique({
        where: { countryId_name: { countryId, name: cleanedName } },
        select: { id: true },
      })
    : await prisma.ratesDimCity.findFirst({
        where: {
          countryId: null,
          name: { equals: cleanedName, mode: "insensitive" },
        },
        select: { id: true },
      });
  const row =
    existing ??
    (await prisma.ratesDimCity.create({
      data: { name: cleanedName, countryId },
      select: { id: true },
    }));
  cache.city.set(key, row.id);
  return row.id;
}

/* ─────────────────────────── Money + Units ───────────────────────── */

export async function findOrCreateCurrency(
  code: string,
  cache: DimCache,
): Promise<string> {
  const iso4217 = iso(code).slice(0, 4);
  if (!iso4217) throw new Error("currency code is required");
  const hit = cache.currency.get(iso4217);
  if (hit) return hit;

  const row = await prisma.ratesDimCurrency.upsert({
    where: { iso4217 },
    update: {},
    create: { iso4217 },
    select: { id: true },
  });
  cache.currency.set(iso4217, row.id);
  return row.id;
}

export async function findOrCreateUom(
  raw: string,
  cache: DimCache,
): Promise<string> {
  const code = normalizeUnit(raw);
  if (!code) throw new Error("unit is required");
  const hit = cache.uom.get(code);
  if (hit) return hit;

  const row = await prisma.ratesDimUom.upsert({
    where: { code },
    update: {},
    create: { code, label: code },
    select: { id: true },
  });
  cache.uom.set(code, row.id);
  return row.id;
}

/* ─────────────────────────── Asset hierarchy ─────────────────────── */

export async function findOrCreateAssetClass(
  label: string,
  cache: DimCache,
): Promise<string> {
  const cleaned = clean(label);
  if (!cleaned) throw new Error("asset class label is required");
  const key = ci(cleaned);
  const hit = cache.assetClass.get(key);
  if (hit) return hit;

  const existing = await prisma.ratesDimAssetClass.findFirst({
    where: { label: { equals: cleaned, mode: "insensitive" } },
    select: { id: true },
  });
  const row =
    existing ??
    (await prisma.ratesDimAssetClass.create({
      data: { label: cleaned },
      select: { id: true },
    }));
  cache.assetClass.set(key, row.id);
  return row.id;
}

export async function findOrCreateAssetType(
  label: string,
  assetClassLabel: string,
  cache: DimCache,
): Promise<string> {
  const cleaned = clean(label);
  if (!cleaned) throw new Error("asset type label is required");
  const assetClassId = await findOrCreateAssetClass(assetClassLabel, cache);
  const key = `${assetClassId}::${ci(cleaned)}`;
  const hit = cache.assetType.get(key);
  if (hit) return hit;

  const existing = await prisma.ratesDimAssetType.findUnique({
    where: { assetClassId_label: { assetClassId, label: cleaned } },
    select: { id: true },
  });
  const row =
    existing ??
    (await prisma.ratesDimAssetType.create({
      data: { assetClassId, label: cleaned },
      select: { id: true },
    }));
  cache.assetType.set(key, row.id);
  return row.id;
}

export async function findOrCreateAssetForm(
  label: string,
  assetTypeId: string | null | undefined,
  cache: DimCache,
): Promise<string> {
  const cleaned = clean(label);
  if (!cleaned) throw new Error("asset form label is required");
  const key = `${assetTypeId ?? "_"}::${ci(cleaned)}`;
  const hit = cache.assetForm.get(key);
  if (hit) return hit;

  const existing = assetTypeId
    ? await prisma.ratesDimAssetForm.findUnique({
        where: { assetTypeId_label: { assetTypeId, label: cleaned } },
        select: { id: true },
      })
    : await prisma.ratesDimAssetForm.findFirst({
        where: {
          assetTypeId: null,
          label: { equals: cleaned, mode: "insensitive" },
        },
        select: { id: true },
      });
  const row =
    existing ??
    (await prisma.ratesDimAssetForm.create({
      data: { label: cleaned, assetTypeId: assetTypeId ?? null },
      select: { id: true },
    }));
  cache.assetForm.set(key, row.id);
  return row.id;
}

/* ─────────────────────────── Companies + contracts ───────────────── */

export async function findOrCreateEmployer(
  name: string,
  countryName: string | null | undefined,
  cache: DimCache,
): Promise<string> {
  const cleaned = clean(name);
  if (!cleaned) throw new Error("employer name is required");
  const key = ci(cleaned);
  const hit = cache.employer.get(key);
  if (hit) return hit;

  const countryId = countryName
    ? await findOrCreateCountry(countryName, cache)
    : null;

  const existing = await prisma.ratesDimEmployer.findFirst({
    where: { name: { equals: cleaned, mode: "insensitive" } },
    select: { id: true },
  });
  const row =
    existing ??
    (await prisma.ratesDimEmployer.create({
      data: { name: cleaned, countryId },
      select: { id: true },
    }));
  cache.employer.set(key, row.id);
  return row.id;
}

export async function findOrCreateContractor(
  name: string,
  countryName: string | null | undefined,
  cache: DimCache,
): Promise<string> {
  const cleaned = clean(name);
  if (!cleaned) throw new Error("contractor name is required");
  const key = ci(cleaned);
  const hit = cache.contractor.get(key);
  if (hit) return hit;

  const countryId = countryName
    ? await findOrCreateCountry(countryName, cache)
    : null;

  const existing = await prisma.ratesDimContractor.findFirst({
    where: { name: { equals: cleaned, mode: "insensitive" } },
    select: { id: true },
  });
  const row =
    existing ??
    (await prisma.ratesDimContractor.create({
      data: { name: cleaned, countryId },
      select: { id: true },
    }));
  cache.contractor.set(key, row.id);
  return row.id;
}

export async function findOrCreateContractType(
  label: string,
  cache: DimCache,
): Promise<string> {
  const cleaned = clean(label);
  if (!cleaned) throw new Error("contract type label is required");
  const key = ci(cleaned);
  const hit = cache.contractType.get(key);
  if (hit) return hit;

  const existing = await prisma.ratesDimContractType.findFirst({
    where: { label: { equals: cleaned, mode: "insensitive" } },
    select: { id: true },
  });
  const row =
    existing ??
    (await prisma.ratesDimContractType.create({
      data: { label: cleaned },
      select: { id: true },
    }));
  cache.contractType.set(key, row.id);
  return row.id;
}

export async function findOrCreateStatus(
  label: string,
  cache: DimCache,
): Promise<string> {
  const cleaned = clean(label);
  if (!cleaned) throw new Error("status label is required");
  const key = ci(cleaned);
  const hit = cache.status.get(key);
  if (hit) return hit;

  const existing = await prisma.ratesDimStatus.findFirst({
    where: { label: { equals: cleaned, mode: "insensitive" } },
    select: { id: true },
  });
  const row =
    existing ??
    (await prisma.ratesDimStatus.create({
      data: { label: cleaned },
      select: { id: true },
    }));
  cache.status.set(key, row.id);
  return row.id;
}

/* ─────────────────────────── Project (composite) ─────────────────── */

export interface ProjectInput {
  name: string;
  baseDate?: Date | null;
  alias?: string | null;
  aliasL1?: string | null;
  aliasL2?: string | null;
  country?: string | null;
  city?: string | null;
  assetClass?: string | null;
  assetType?: string | null;
  assetForm?: string | null;
  employer?: string | null;
  contractor?: string | null;
  contractType?: string | null;
  status?: string | null;
  currency?: string | null;
  bua?: number | null;
  gia?: number | null;
  gfa?: number | null;
  keys?: number | null;
  procurement?: string | null;
}

export async function findOrCreateProject(
  input: ProjectInput,
  cache: DimCache,
): Promise<string> {
  const name = clean(input.name);
  if (!name) throw new Error("project name is required");
  const baseDate = input.baseDate ?? null;
  const key = `${ci(name)}::${baseDate ? baseDate.toISOString().slice(0, 10) : "_"}`;
  const hit = cache.project.get(key);
  if (hit) return hit;

  const countryId    = input.country      ? await findOrCreateCountry(input.country, cache) : null;
  const cityId       = input.city         ? await findOrCreateCity(input.city, input.country, cache) : null;
  const assetClassId = input.assetClass   ? await findOrCreateAssetClass(input.assetClass, cache) : null;
  const assetTypeId  = input.assetType && input.assetClass
    ? await findOrCreateAssetType(input.assetType, input.assetClass, cache)
    : null;
  const assetFormId  = input.assetForm    ? await findOrCreateAssetForm(input.assetForm, assetTypeId, cache) : null;
  const employerId   = input.employer     ? await findOrCreateEmployer(input.employer, input.country, cache) : null;
  const contractorId = input.contractor   ? await findOrCreateContractor(input.contractor, input.country, cache) : null;
  const contractTypeId = input.contractType ? await findOrCreateContractType(input.contractType, cache) : null;
  const statusId     = input.status       ? await findOrCreateStatus(input.status, cache) : null;
  const currencyId   = input.currency     ? await findOrCreateCurrency(input.currency, cache) : null;

  // Compound natural key (name, baseDate)
  const existing = await prisma.ratesDimProject.findUnique({
    where: { name_baseDate: { name, baseDate: baseDate ?? new Date(0) } },
    select: { id: true },
  });

  const data = {
    name,
    baseDate,
    aliasL1: clean(input.aliasL1 ?? input.alias ?? "") || null,
    aliasL2: clean(input.aliasL2 ?? "") || null,
    countryId,
    cityId,
    assetClassId,
    assetTypeId,
    assetFormId,
    employerId,
    contractorId,
    contractTypeId,
    statusId,
    currencyId,
    buaM2: input.bua ?? null,
    giaM2: input.gia ?? null,
    gfaM2: input.gfa ?? null,
    keys:  input.keys ?? null,
    procurement: clean(input.procurement ?? "") || null,
  };

  const row =
    existing ??
    (await prisma.ratesDimProject.create({ data, select: { id: true } }));

  cache.project.set(key, row.id);
  return row.id;
}

/* ─────────────────────────── POMI + NRM trees ────────────────────── */

export async function findOrCreatePomiSection(
  code: string,
  label: string | undefined,
  cache: DimCache,
): Promise<string> {
  const c = clean(code).toUpperCase().slice(0, 1);
  if (!c) throw new Error("POMI section code is required");
  const hit = cache.pomiSection.get(c);
  if (hit) return hit;

  const row = await prisma.ratesDimPomiSection.upsert({
    where: { code: c },
    update: {},
    create: { code: c, label: clean(label) || c },
    select: { id: true },
  });
  cache.pomiSection.set(c, row.id);
  return row.id;
}

export async function findOrCreatePomiSubSection(
  label: string,
  pomiSectionCode: string,
  cache: DimCache,
): Promise<string> {
  const cleaned = clean(label);
  if (!cleaned) throw new Error("POMI sub-section label is required");
  const pomiSectionId = await findOrCreatePomiSection(pomiSectionCode, undefined, cache);
  const key = `${pomiSectionId}::${ci(cleaned)}`;
  const hit = cache.pomiSubSection.get(key);
  if (hit) return hit;

  const existing = await prisma.ratesDimPomiSubSection.findUnique({
    where: { pomiSectionId_label: { pomiSectionId, label: cleaned } },
    select: { id: true },
  });
  const row =
    existing ??
    (await prisma.ratesDimPomiSubSection.create({
      data: { pomiSectionId, label: cleaned },
      select: { id: true },
    }));
  cache.pomiSubSection.set(key, row.id);
  return row.id;
}

export async function findOrCreateNrmL1(
  code: string,
  label: string | undefined,
  cache: DimCache,
): Promise<string> {
  const c = clean(code);
  if (!c) throw new Error("NRM L1 code is required");
  const hit = cache.nrmL1.get(c);
  if (hit) return hit;

  const row = await prisma.ratesDimNrmL1.upsert({
    where: { code: c },
    update: {},
    create: { code: c, label: clean(label) || c },
    select: { id: true },
  });
  cache.nrmL1.set(c, row.id);
  return row.id;
}

export async function findOrCreateNrmL2(
  code: string,
  label: string | undefined,
  nrmL1Code: string,
  cache: DimCache,
): Promise<string> {
  const c = clean(code);
  if (!c) throw new Error("NRM L2 code is required");
  const nrmL1Id = await findOrCreateNrmL1(nrmL1Code, undefined, cache);
  const key = `${nrmL1Id}::${c}`;
  const hit = cache.nrmL2.get(key);
  if (hit) return hit;

  const existing = await prisma.ratesDimNrmL2.findUnique({
    where: { nrmL1Id_code: { nrmL1Id, code: c } },
    select: { id: true },
  });
  const row =
    existing ??
    (await prisma.ratesDimNrmL2.create({
      data: { nrmL1Id, code: c, label: clean(label) || c },
      select: { id: true },
    }));
  cache.nrmL2.set(key, row.id);
  return row.id;
}

export async function findOrCreateNrmL3(
  code: string,
  label: string | undefined,
  nrmL2Code: string,
  nrmL1Code: string,
  cache: DimCache,
): Promise<string> {
  const c = clean(code);
  if (!c) throw new Error("NRM L3 code is required");
  const nrmL2Id = await findOrCreateNrmL2(nrmL2Code, undefined, nrmL1Code, cache);
  const key = `${nrmL2Id}::${c}`;
  const hit = cache.nrmL3.get(key);
  if (hit) return hit;

  const existing = await prisma.ratesDimNrmL3.findUnique({
    where: { nrmL2Id_code: { nrmL2Id, code: c } },
    select: { id: true },
  });
  const row =
    existing ??
    (await prisma.ratesDimNrmL3.create({
      data: { nrmL2Id, code: c, label: clean(label) || c },
      select: { id: true },
    }));
  cache.nrmL3.set(key, row.id);
  return row.id;
}

/* ─────────────────────────── CESMM + CSI ─────────────────────────── */

export async function findOrCreateCesmmRef(
  code: string,
  label: string | undefined,
  cache: DimCache,
): Promise<string> {
  const c = clean(code);
  if (!c) throw new Error("CESMM code is required");
  const hit = cache.cesmmRef.get(c);
  if (hit) return hit;

  const row = await prisma.ratesDimCesmmRef.upsert({
    where: { code: c },
    update: {},
    create: { code: c, label: clean(label) || c },
    select: { id: true },
  });
  cache.cesmmRef.set(c, row.id);
  return row.id;
}

export async function findOrCreateCsiCode(
  code: string,
  label: string | undefined,
  cache: DimCache,
): Promise<string> {
  const c = clean(code);
  if (!c) throw new Error("CSI code is required");
  const hit = cache.csiCode.get(c);
  if (hit) return hit;

  const row = await prisma.ratesDimCsiCode.upsert({
    where: { code: c },
    update: {},
    create: { code: c, label: clean(label) || c },
    select: { id: true },
  });
  cache.csiCode.set(c, row.id);
  return row.id;
}

/* ─────────────────────────── Materials ───────────────────────────── */

export async function findOrCreateMaterial(
  label: string,
  family: string | null | undefined,
  cache: DimCache,
): Promise<string> {
  const cleaned = clean(label);
  if (!cleaned) throw new Error("material label is required");
  const key = ci(cleaned);
  const hit = cache.material.get(key);
  if (hit) return hit;

  const existing = await prisma.ratesDimMaterial.findFirst({
    where: { label: { equals: cleaned, mode: "insensitive" } },
    select: { id: true },
  });
  const row =
    existing ??
    (await prisma.ratesDimMaterial.create({
      data: { label: cleaned, family: clean(family ?? "") || null },
      select: { id: true },
    }));
  cache.material.set(key, row.id);
  return row.id;
}

/* ─────────────────────────── MEP systems ─────────────────────────── */

export async function findOrCreateMepSystem(
  label: string,
  cache: DimCache,
): Promise<string> {
  const cleaned = clean(label);
  if (!cleaned) throw new Error("MEP system label is required");
  const key = ci(cleaned);
  const hit = cache.mepSystem.get(key);
  if (hit) return hit;

  const existing = await prisma.ratesDimMepSystem.findFirst({
    where: { label: { equals: cleaned, mode: "insensitive" } },
    select: { id: true },
  });
  const row =
    existing ??
    (await prisma.ratesDimMepSystem.create({
      data: { label: cleaned },
      select: { id: true },
    }));
  cache.mepSystem.set(key, row.id);
  return row.id;
}

export async function findOrCreateMepSubsystem(
  label: string,
  mepSystemLabel: string,
  cache: DimCache,
): Promise<string> {
  const cleaned = clean(label);
  if (!cleaned) throw new Error("MEP subsystem label is required");
  const mepSystemId = await findOrCreateMepSystem(mepSystemLabel, cache);
  const key = `${mepSystemId}::${ci(cleaned)}`;
  const hit = cache.mepSubsystem.get(key);
  if (hit) return hit;

  const existing = await prisma.ratesDimMepSubsystem.findUnique({
    where: { mepSystemId_label: { mepSystemId, label: cleaned } },
    select: { id: true },
  });
  const row =
    existing ??
    (await prisma.ratesDimMepSubsystem.create({
      data: { mepSystemId, label: cleaned },
      select: { id: true },
    }));
  cache.mepSubsystem.set(key, row.id);
  return row.id;
}
