-- ═══════════════════════════════════════════════════════════════════════════
-- Rates v2 — 30-table normalized model
--
-- Replaces the single `rates_uploads.rows JSON` blob with proper
-- dimensions, facts, and lineage so the rates module can be queried
-- per item / per project / per typology and is friendly to AI agents.
--
-- Naming:  rates_dim_*  = small lookup tables (one row per unique value)
--          rates_fact_* = large data tables (every priced row, etc.)
--          rates_upload_v2 = lineage (where each row came from)
--
-- Apply with:
--   psql "$DATABASE_URL" -f web/prisma/migrations/manual/rates_v2/migration.sql
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ───────────────────────────────────────────────────────────────────────────
-- DIMENSIONS (24 tables)
-- ───────────────────────────────────────────────────────────────────────────

-- 1. Sections (Buildings, Infrastructure, …)
CREATE TABLE IF NOT EXISTS rates_dim_section (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL UNIQUE,
  label         TEXT NOT NULL,
  display_order INT  NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabs (Rates, Benchmarks, …) per section
CREATE TABLE IF NOT EXISTS rates_dim_tab (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id    UUID NOT NULL REFERENCES rates_dim_section(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  display_order INT  NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (section_id, label)
);

-- 3. Countries (ISO + label)
CREATE TABLE IF NOT EXISTS rates_dim_country (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iso2 TEXT UNIQUE,
  iso3 TEXT UNIQUE,
  name TEXT NOT NULL UNIQUE
);

-- 4. Cities (one per country)
CREATE TABLE IF NOT EXISTS rates_dim_city (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID REFERENCES rates_dim_country(id) ON DELETE SET NULL,
  name       TEXT NOT NULL,
  UNIQUE (country_id, name)
);

-- 5. Currencies (ISO 4217)
CREATE TABLE IF NOT EXISTS rates_dim_currency (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iso4217  TEXT NOT NULL UNIQUE,
  symbol   TEXT,
  decimals SMALLINT NOT NULL DEFAULT 2
);

-- 6. Units of measure (normalized codes)
CREATE TABLE IF NOT EXISTS rates_dim_uom (
  id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code   TEXT NOT NULL UNIQUE, -- m2, m3, kg, t, lm, nr, hr, set
  label  TEXT NOT NULL,
  family TEXT                  -- area | length | mass | count | time | volume | other
);

-- 7. Asset classes (Residential, Commercial, …)
CREATE TABLE IF NOT EXISTS rates_dim_asset_class (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE
);

-- 8. Asset types (Office Mid Rise, Townhouse, …)
CREATE TABLE IF NOT EXISTS rates_dim_asset_type (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_class_id UUID NOT NULL REFERENCES rates_dim_asset_class(id) ON DELETE CASCADE,
  label          TEXT NOT NULL,
  UNIQUE (asset_class_id, label)
);

-- 9. Asset forms (Concrete frame, Steel frame, …)
CREATE TABLE IF NOT EXISTS rates_dim_asset_form (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type_id UUID REFERENCES rates_dim_asset_type(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  UNIQUE (asset_type_id, label)
);

-- 10. Employers / Clients
CREATE TABLE IF NOT EXISTS rates_dim_employer (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  country_id UUID REFERENCES rates_dim_country(id) ON DELETE SET NULL
);

-- 11. Contractors
CREATE TABLE IF NOT EXISTS rates_dim_contractor (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  country_id UUID REFERENCES rates_dim_country(id) ON DELETE SET NULL
);

-- 12. Contract types
CREATE TABLE IF NOT EXISTS rates_dim_contract_type (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE
);

-- 13. Statuses
CREATE TABLE IF NOT EXISTS rates_dim_status (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE
);

-- 14. Projects (links to every other dimension)
CREATE TABLE IF NOT EXISTS rates_dim_project (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  alias_l1         TEXT,
  alias_l2         TEXT,
  country_id       UUID REFERENCES rates_dim_country(id),
  city_id          UUID REFERENCES rates_dim_city(id),
  asset_class_id   UUID REFERENCES rates_dim_asset_class(id),
  asset_type_id    UUID REFERENCES rates_dim_asset_type(id),
  asset_form_id    UUID REFERENCES rates_dim_asset_form(id),
  employer_id      UUID REFERENCES rates_dim_employer(id),
  contractor_id    UUID REFERENCES rates_dim_contractor(id),
  contract_type_id UUID REFERENCES rates_dim_contract_type(id),
  status_id        UUID REFERENCES rates_dim_status(id),
  currency_id      UUID REFERENCES rates_dim_currency(id),
  base_date        DATE,
  bua_m2           NUMERIC(14, 2),
  gia_m2           NUMERIC(14, 2),
  gfa_m2           NUMERIC(14, 2),
  keys             INT,
  procurement      TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, base_date)
);
CREATE INDEX IF NOT EXISTS rates_dim_project_asset_idx
  ON rates_dim_project (asset_class_id, asset_type_id, base_date);
CREATE INDEX IF NOT EXISTS rates_dim_project_country_idx
  ON rates_dim_project (country_id, base_date);

-- 15. POMI sections (A..R)
CREATE TABLE IF NOT EXISTS rates_dim_pomi_section (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code  CHAR(1) NOT NULL UNIQUE, -- 'A'..'R'
  label TEXT NOT NULL
);

-- 16. POMI sub-sections
CREATE TABLE IF NOT EXISTS rates_dim_pomi_sub_section (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pomi_section_id UUID NOT NULL REFERENCES rates_dim_pomi_section(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  UNIQUE (pomi_section_id, label)
);

-- 17. NRM Level 1
CREATE TABLE IF NOT EXISTS rates_dim_nrm_l1 (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code  TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL
);

-- 18. NRM Level 2
CREATE TABLE IF NOT EXISTS rates_dim_nrm_l2 (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nrm_l1_id UUID NOT NULL REFERENCES rates_dim_nrm_l1(id) ON DELETE CASCADE,
  code      TEXT NOT NULL,
  label     TEXT NOT NULL,
  UNIQUE (nrm_l1_id, code)
);

-- 19. NRM Level 3
CREATE TABLE IF NOT EXISTS rates_dim_nrm_l3 (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nrm_l2_id UUID NOT NULL REFERENCES rates_dim_nrm_l2(id) ON DELETE CASCADE,
  code      TEXT NOT NULL,
  label     TEXT NOT NULL,
  UNIQUE (nrm_l2_id, code)
);

-- 20. CESMM refs (civil engineering codes)
CREATE TABLE IF NOT EXISTS rates_dim_cesmm_ref (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code  TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL
);

-- 21. CSI codes (design ratios)
CREATE TABLE IF NOT EXISTS rates_dim_csi_code (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code  TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL
);

-- 22. Materials / commodities
CREATE TABLE IF NOT EXISTS rates_dim_material (
  id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label  TEXT NOT NULL UNIQUE,
  family TEXT
);

-- 23. MEP systems (HVAC, Plumbing, …)
CREATE TABLE IF NOT EXISTS rates_dim_mep_system (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE
);

-- 24. MEP subsystems (Chillers, AHUs, …)
CREATE TABLE IF NOT EXISTS rates_dim_mep_subsystem (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mep_system_id UUID NOT NULL REFERENCES rates_dim_mep_system(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  UNIQUE (mep_system_id, label)
);

-- ───────────────────────────────────────────────────────────────────────────
-- LINEAGE (1 table)
-- Note: we deliberately keep the legacy `rates_uploads` blob table for now
-- so the existing UI keeps working. The new pipeline writes here.
-- ───────────────────────────────────────────────────────────────────────────

-- 25. Upload lineage (every loaded file)
CREATE TABLE IF NOT EXISTS rates_upload_v2 (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id      UUID NOT NULL REFERENCES rates_dim_section(id),
  tab_id          UUID REFERENCES rates_dim_tab(id),
  file_name       TEXT NOT NULL,
  size_bytes      BIGINT NOT NULL,
  sheet_name      TEXT,
  row_count       INT NOT NULL DEFAULT 0,
  parser_name     TEXT NOT NULL,
  parser_version  TEXT,
  schema_version  TEXT,
  status          TEXT NOT NULL DEFAULT 'parsed', -- parsed | loaded | failed
  error           TEXT,
  uploaded_by_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  loaded_at       TIMESTAMPTZ,
  extra_columns   JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_sample      JSONB
);
CREATE INDEX IF NOT EXISTS rates_upload_v2_section_idx ON rates_upload_v2 (section_id);
CREATE INDEX IF NOT EXISTS rates_upload_v2_uploaded_at_idx ON rates_upload_v2 (uploaded_at DESC);

-- ───────────────────────────────────────────────────────────────────────────
-- FACTS (5 tables — the actual numbers)
-- ───────────────────────────────────────────────────────────────────────────

-- 26. Rate items (the big one — every priced BOQ line)
CREATE TABLE IF NOT EXISTS rates_fact_rate_item (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id            UUID NOT NULL REFERENCES rates_upload_v2(id) ON DELETE CASCADE,
  section_id           UUID NOT NULL REFERENCES rates_dim_section(id),
  tab_id               UUID REFERENCES rates_dim_tab(id),
  project_id           UUID REFERENCES rates_dim_project(id),
  pomi_section_id      UUID REFERENCES rates_dim_pomi_section(id),
  pomi_sub_id          UUID REFERENCES rates_dim_pomi_sub_section(id),
  nrm_l1_id            UUID REFERENCES rates_dim_nrm_l1(id),
  nrm_l2_id            UUID REFERENCES rates_dim_nrm_l2(id),
  nrm_l3_id            UUID REFERENCES rates_dim_nrm_l3(id),
  cesmm_ref_id         UUID REFERENCES rates_dim_cesmm_ref(id),
  description          TEXT NOT NULL,
  description_norm     TEXT GENERATED ALWAYS AS (lower(trim(description))) STORED,
  description_tsv      TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', coalesce(description, ''))) STORED,
  quantity             NUMERIC(18, 4),
  unit_id              UUID REFERENCES rates_dim_uom(id),
  currency_id          UUID REFERENCES rates_dim_currency(id),
  rate                 NUMERIC(18, 4),
  amount               NUMERIC(20, 4),
  base_date            DATE,
  inflation_rate       NUMERIC(8, 4),
  is_outlier           BOOLEAN NOT NULL DEFAULT false,
  confidence           SMALLINT,
  classification_stage TEXT, -- rule | fuzzy | ai | manual
  inserted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rates_fact_rate_item_project_idx     ON rates_fact_rate_item (project_id);
CREATE INDEX IF NOT EXISTS rates_fact_rate_item_pomi_idx        ON rates_fact_rate_item (pomi_section_id);
CREATE INDEX IF NOT EXISTS rates_fact_rate_item_nrm_l1_idx      ON rates_fact_rate_item (nrm_l1_id);
CREATE INDEX IF NOT EXISTS rates_fact_rate_item_nrm_l2_idx      ON rates_fact_rate_item (nrm_l2_id);
CREATE INDEX IF NOT EXISTS rates_fact_rate_item_unit_idx        ON rates_fact_rate_item (unit_id);
CREATE INDEX IF NOT EXISTS rates_fact_rate_item_currency_idx    ON rates_fact_rate_item (currency_id);
CREATE INDEX IF NOT EXISTS rates_fact_rate_item_base_date_idx   ON rates_fact_rate_item (base_date);
CREATE INDEX IF NOT EXISTS rates_fact_rate_item_upload_idx      ON rates_fact_rate_item (upload_id);
CREATE INDEX IF NOT EXISTS rates_fact_rate_item_tsv_idx         ON rates_fact_rate_item USING GIN (description_tsv);
CREATE INDEX IF NOT EXISTS rates_fact_rate_item_unpriced_idx    ON rates_fact_rate_item (currency_id) WHERE rate IS NULL;

-- 27. Project benchmarks (cost-per-area roll-ups)
CREATE TABLE IF NOT EXISTS rates_fact_project_benchmark (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id        UUID NOT NULL REFERENCES rates_upload_v2(id) ON DELETE CASCADE,
  project_id       UUID NOT NULL REFERENCES rates_dim_project(id) ON DELETE CASCADE,
  nrm_l1_id        UUID REFERENCES rates_dim_nrm_l1(id),
  mep_system_id    UUID REFERENCES rates_dim_mep_system(id),
  mep_subsystem_id UUID REFERENCES rates_dim_mep_subsystem(id),
  bua_m2           NUMERIC(14, 2),
  gia_m2           NUMERIC(14, 2),
  gfa_m2           NUMERIC(14, 2),
  keys             INT,
  total_cost       NUMERIC(20, 2),
  currency_id      UUID REFERENCES rates_dim_currency(id),
  cost_per_bua     NUMERIC(18, 4),
  cost_per_gia     NUMERIC(18, 4),
  cost_per_gfa     NUMERIC(18, 4),
  inserted_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rates_fact_project_benchmark_proj_nrm_idx
  ON rates_fact_project_benchmark (project_id, nrm_l1_id);
CREATE INDEX IF NOT EXISTS rates_fact_project_benchmark_mep_idx
  ON rates_fact_project_benchmark (mep_system_id);

-- 28. Design ratios (one row per NRM/CSI line)
CREATE TABLE IF NOT EXISTS rates_fact_design_ratio (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id   UUID NOT NULL REFERENCES rates_upload_v2(id) ON DELETE CASCADE,
  nrm_l1_id   UUID REFERENCES rates_dim_nrm_l1(id),
  nrm_l2_id   UUID REFERENCES rates_dim_nrm_l2(id),
  nrm_l3_id   UUID REFERENCES rates_dim_nrm_l3(id),
  csi_code_id UUID REFERENCES rates_dim_csi_code(id),
  unit_id     UUID REFERENCES rates_dim_uom(id),
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rates_fact_design_ratio_nrm_idx ON rates_fact_design_ratio (nrm_l1_id, nrm_l2_id);

-- 28b. Design ratios per asset-type combination (side table)
CREATE TABLE IF NOT EXISTS rates_fact_design_ratio_asset_type (
  ratio_id       UUID NOT NULL REFERENCES rates_fact_design_ratio(id) ON DELETE CASCADE,
  asset_class_id UUID NOT NULL REFERENCES rates_dim_asset_class(id),
  asset_type_id  UUID NOT NULL REFERENCES rates_dim_asset_type(id),
  asset_form_id  UUID REFERENCES rates_dim_asset_form(id),
  ratio_value    NUMERIC(18, 6) NOT NULL,
  PRIMARY KEY (ratio_id, asset_class_id, asset_type_id, asset_form_id)
);

-- 29. Material / commodity prices
CREATE TABLE IF NOT EXISTS rates_fact_material_price (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id    UUID NOT NULL REFERENCES rates_upload_v2(id) ON DELETE CASCADE,
  material_id  UUID NOT NULL REFERENCES rates_dim_material(id),
  country_id   UUID REFERENCES rates_dim_country(id),
  currency_id  UUID REFERENCES rates_dim_currency(id),
  unit_id      UUID REFERENCES rates_dim_uom(id),
  price        NUMERIC(18, 4) NOT NULL,
  vintage_date DATE NOT NULL,
  source       TEXT,
  notes        TEXT,
  inserted_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rates_fact_material_price_lookup_idx
  ON rates_fact_material_price (material_id, country_id, vintage_date DESC);

-- 30. Market testing log
CREATE TABLE IF NOT EXISTS rates_market_test_query (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asked_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  question         TEXT NOT NULL,
  context          JSONB,
  response         JSONB,
  asked_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rates_market_test_query_asked_at_idx
  ON rates_market_test_query (asked_at DESC);

-- ───────────────────────────────────────────────────────────────────────────
-- VIEWS (flat / AI-friendly reads)
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_rates_rate_items_full AS
SELECT
  fri.id,
  sec.label   AS section,
  tab.label   AS tab,
  proj.name   AS project,
  cnt.name    AS country,
  cty.name    AS city,
  ac.label    AS asset_class,
  at.label    AS asset_type,
  af.label    AS asset_form,
  emp.name    AS employer,
  con.name    AS contractor,
  ct.label    AS contract_type,
  st.label    AS status,
  ps.code     AS pomi_section_code,
  ps.label    AS pomi_section,
  pss.label   AS pomi_sub_section,
  n1.code     AS nrm_l1_code,
  n1.label    AS nrm_l1,
  n2.label    AS nrm_l2,
  n3.label    AS nrm_l3,
  cesmm.code  AS cesmm_ref,
  fri.description,
  fri.quantity,
  uom.code    AS unit,
  cur.iso4217 AS currency,
  fri.rate,
  fri.amount,
  fri.base_date,
  fri.inflation_rate,
  fri.is_outlier,
  fri.confidence,
  fri.classification_stage,
  fri.upload_id,
  fri.inserted_at
FROM rates_fact_rate_item fri
LEFT JOIN rates_dim_section          sec  ON sec.id  = fri.section_id
LEFT JOIN rates_dim_tab              tab  ON tab.id  = fri.tab_id
LEFT JOIN rates_dim_project          proj ON proj.id = fri.project_id
LEFT JOIN rates_dim_country          cnt  ON cnt.id  = proj.country_id
LEFT JOIN rates_dim_city             cty  ON cty.id  = proj.city_id
LEFT JOIN rates_dim_asset_class      ac   ON ac.id   = proj.asset_class_id
LEFT JOIN rates_dim_asset_type       at   ON at.id   = proj.asset_type_id
LEFT JOIN rates_dim_asset_form       af   ON af.id   = proj.asset_form_id
LEFT JOIN rates_dim_employer         emp  ON emp.id  = proj.employer_id
LEFT JOIN rates_dim_contractor       con  ON con.id  = proj.contractor_id
LEFT JOIN rates_dim_contract_type    ct   ON ct.id   = proj.contract_type_id
LEFT JOIN rates_dim_status           st   ON st.id   = proj.status_id
LEFT JOIN rates_dim_pomi_section     ps   ON ps.id   = fri.pomi_section_id
LEFT JOIN rates_dim_pomi_sub_section pss  ON pss.id  = fri.pomi_sub_id
LEFT JOIN rates_dim_nrm_l1           n1   ON n1.id   = fri.nrm_l1_id
LEFT JOIN rates_dim_nrm_l2           n2   ON n2.id   = fri.nrm_l2_id
LEFT JOIN rates_dim_nrm_l3           n3   ON n3.id   = fri.nrm_l3_id
LEFT JOIN rates_dim_cesmm_ref        cesmm ON cesmm.id = fri.cesmm_ref_id
LEFT JOIN rates_dim_uom              uom  ON uom.id  = fri.unit_id
LEFT JOIN rates_dim_currency         cur  ON cur.id  = fri.currency_id;

CREATE OR REPLACE VIEW v_rates_project_benchmarks_full AS
SELECT
  b.id,
  proj.name   AS project,
  cnt.name    AS country,
  cty.name    AS city,
  ac.label    AS asset_class,
  at.label    AS asset_type,
  af.label    AS asset_form,
  emp.name    AS employer,
  con.name    AS contractor,
  ct.label    AS contract_type,
  st.label    AS status,
  proj.base_date,
  n1.code     AS nrm_l1_code,
  n1.label    AS nrm_l1,
  mep.label   AS mep_system,
  mepsub.label AS mep_subsystem,
  b.bua_m2,
  b.gia_m2,
  b.gfa_m2,
  b.keys,
  cur.iso4217 AS currency,
  b.total_cost,
  b.cost_per_bua,
  b.cost_per_gia,
  b.cost_per_gfa,
  b.inserted_at
FROM rates_fact_project_benchmark b
LEFT JOIN rates_dim_project       proj   ON proj.id = b.project_id
LEFT JOIN rates_dim_country       cnt    ON cnt.id  = proj.country_id
LEFT JOIN rates_dim_city          cty    ON cty.id  = proj.city_id
LEFT JOIN rates_dim_asset_class   ac     ON ac.id   = proj.asset_class_id
LEFT JOIN rates_dim_asset_type    at     ON at.id   = proj.asset_type_id
LEFT JOIN rates_dim_asset_form    af     ON af.id   = proj.asset_form_id
LEFT JOIN rates_dim_employer      emp    ON emp.id  = proj.employer_id
LEFT JOIN rates_dim_contractor    con    ON con.id  = proj.contractor_id
LEFT JOIN rates_dim_contract_type ct     ON ct.id   = proj.contract_type_id
LEFT JOIN rates_dim_status        st     ON st.id   = proj.status_id
LEFT JOIN rates_dim_nrm_l1        n1     ON n1.id   = b.nrm_l1_id
LEFT JOIN rates_dim_mep_system    mep    ON mep.id  = b.mep_system_id
LEFT JOIN rates_dim_mep_subsystem mepsub ON mepsub.id = b.mep_subsystem_id
LEFT JOIN rates_dim_currency      cur    ON cur.id  = b.currency_id;

CREATE OR REPLACE VIEW v_rates_material_prices_full AS
SELECT
  mp.id,
  mat.label   AS material,
  mat.family  AS material_family,
  cnt.name    AS country,
  cur.iso4217 AS currency,
  uom.code    AS unit,
  mp.price,
  mp.vintage_date,
  mp.source,
  mp.notes,
  mp.inserted_at
FROM rates_fact_material_price mp
LEFT JOIN rates_dim_material mat ON mat.id = mp.material_id
LEFT JOIN rates_dim_country  cnt ON cnt.id = mp.country_id
LEFT JOIN rates_dim_currency cur ON cur.id = mp.currency_id
LEFT JOIN rates_dim_uom      uom ON uom.id = mp.unit_id;

-- ───────────────────────────────────────────────────────────────────────────
-- SEEDS (only the things that ship in code today)
-- ───────────────────────────────────────────────────────────────────────────

-- 11 sections (mirrors web/modules/rates/lib/schemas.ts → SECTIONS)
INSERT INTO rates_dim_section (code, label, display_order) VALUES
  ('buildings',           'Buildings',            10),
  ('infrastructure',      'Infrastructure',       20),
  ('industrial',          'Industrial',           30),
  ('utility_buildings',   'Utility Buildings',    40),
  ('public_realm',        'Public Realm',         50),
  ('marine',              'Marine',               60),
  ('piling',              'Piling',               70),
  ('ground_investigation','Ground Investigation', 80),
  ('stadium',             'Stadium',              90),
  ('materials',           'Materials',           100),
  ('market_testing_log',  'Market Testing Log',  110)
ON CONFLICT (code) DO NOTHING;

-- Tabs per section
INSERT INTO rates_dim_tab (section_id, label, display_order)
SELECT s.id, t.label, t.ord
FROM rates_dim_section s
JOIN (VALUES
  ('buildings',           'Rates',             10),
  ('buildings',           'Benchmarks',        20),
  ('buildings',           'Design Ratios',     30),
  ('buildings',           'MEP Benchmarks',    40),
  ('infrastructure',      'Rates & Benchmarks',10),
  ('infrastructure',      'Benchmarks',        20),
  ('industrial',          'Benchmarks',        10),
  ('utility_buildings',   'Rates',             10),
  ('public_realm',        'Rates',             10),
  ('public_realm',        'Benchmarks',        20),
  ('marine',              'Rates',             10),
  ('piling',              'Rates',             10),
  ('piling',              'Framework Rates',   20),
  ('ground_investigation','Rates',             10),
  ('stadium',             'Benchmarks',        10),
  ('materials',           'Materials',         10),
  ('materials',           'Commodities',       20)
) t(section_code, label, ord) ON t.section_code = s.code
ON CONFLICT (section_id, label) DO NOTHING;

-- POMI A..R (16 sections — letters I and O are skipped in POMI)
INSERT INTO rates_dim_pomi_section (code, label) VALUES
  ('A','General'),
  ('B','Concrete Work'),
  ('C','Masonry'),
  ('D','Metalwork'),
  ('E','Woodwork'),
  ('F','Thermal & Moisture Protection'),
  ('G','Doors & Windows'),
  ('H','Finishes'),
  ('J','Specialties'),
  ('K','Equipment'),
  ('L','Furnishings'),
  ('M','Special Construction'),
  ('N','Conveying Systems'),
  ('P','Mechanical'),
  ('Q','Electrical'),
  ('R','Site Work')
ON CONFLICT (code) DO NOTHING;

-- Common currencies
INSERT INTO rates_dim_currency (iso4217, symbol, decimals) VALUES
  ('AED','د.إ',2),
  ('SAR','﷼',2),
  ('USD','$', 2),
  ('EUR','€', 2),
  ('GBP','£', 2),
  ('QAR','﷼',2),
  ('OMR','﷼',3),
  ('KWD','د.ك',3),
  ('INR','₹', 2)
ON CONFLICT (iso4217) DO NOTHING;

-- Common units
INSERT INTO rates_dim_uom (code, label, family) VALUES
  ('m2',  'm²',          'area'),
  ('m3',  'm³',          'volume'),
  ('m',   'm',           'length'),
  ('lm',  'linear m',    'length'),
  ('km',  'km',          'length'),
  ('kg',  'kg',          'mass'),
  ('t',   'tonne',       'mass'),
  ('nr',  'no.',         'count'),
  ('set', 'set',         'count'),
  ('item','item',        'count'),
  ('hr',  'hour',        'time'),
  ('day', 'day',         'time'),
  ('lot', 'lot',         'count'),
  ('ls',  'lump sum',    'count')
ON CONFLICT (code) DO NOTHING;

-- Common contract types
INSERT INTO rates_dim_contract_type (label) VALUES
  ('Lump Sum'),
  ('Re-measurement'),
  ('Cost Plus'),
  ('Target Cost'),
  ('Fixed Price Lump Sum'),
  ('GMP'),
  ('Framework'),
  ('EPC')
ON CONFLICT (label) DO NOTHING;

-- Common statuses
INSERT INTO rates_dim_status (label) VALUES
  ('Award'),
  ('Awarded'),
  ('Tender'),
  ('Pre-Tender'),
  ('Design'),
  ('Concept'),
  ('On Hold'),
  ('Cancelled')
ON CONFLICT (label) DO NOTHING;

-- MEP systems
INSERT INTO rates_dim_mep_system (label) VALUES
  ('HVAC'),
  ('Plumbing'),
  ('Electrical'),
  ('Fire Alarm'),
  ('Fire Sprinkler'),
  ('BMS'),
  ('Lifts'),
  ('Low Voltage')
ON CONFLICT (label) DO NOTHING;

-- Common asset classes
INSERT INTO rates_dim_asset_class (label) VALUES
  ('Residential'),
  ('Commercial'),
  ('Hospitality'),
  ('Retail'),
  ('Industrial'),
  ('Education'),
  ('Healthcare'),
  ('Mixed Use'),
  ('Community Building'),
  ('Public Realm'),
  ('Infrastructure'),
  ('Marine'),
  ('Stadium')
ON CONFLICT (label) DO NOTHING;

-- Common countries (Gulf + UK + US — extend later)
INSERT INTO rates_dim_country (iso2, iso3, name) VALUES
  ('AE','ARE','United Arab Emirates'),
  ('SA','SAU','Saudi Arabia'),
  ('QA','QAT','Qatar'),
  ('OM','OMN','Oman'),
  ('KW','KWT','Kuwait'),
  ('BH','BHR','Bahrain'),
  ('GB','GBR','United Kingdom'),
  ('US','USA','United States'),
  ('IN','IND','India')
ON CONFLICT (name) DO NOTHING;

-- Common GCC cities
INSERT INTO rates_dim_city (country_id, name)
SELECT c.id, x.name
FROM rates_dim_country c
JOIN (VALUES
  ('AE','Dubai'),
  ('AE','Abu Dhabi'),
  ('AE','Sharjah'),
  ('AE','Ras Al Khaimah'),
  ('SA','Riyadh'),
  ('SA','Jeddah'),
  ('SA','Khafji City'),
  ('SA','NEOM'),
  ('SA','Trojena'),
  ('QA','Doha'),
  ('OM','Muscat'),
  ('KW','Kuwait City'),
  ('GB','London')
) x(iso2, name) ON x.iso2 = c.iso2
ON CONFLICT (country_id, name) DO NOTHING;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- Done. 24 dim + 1 lineage + 5 fact + 1 side table = 31 tables, 3 views, seeded.
-- Next step: write the dimension findOrCreate helpers and per-fact loaders in
-- web/modules/rates/lib/db/.
-- ═══════════════════════════════════════════════════════════════════════════
