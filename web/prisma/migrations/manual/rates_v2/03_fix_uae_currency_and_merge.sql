-- ─────────────────────────────────────────────────────────────────────────
-- RatesX country/currency canonicalisation.
--
-- WHY
--   The dimension data carries duplicate country labels and missing
--   currencies, which silently break the currency axis (assistant +
--   elemental-by-project) and split filters:
--     • "United Arab Emirates" duplicates "UAE" (28 projects), and 11 of them
--       — the ones carrying the full infrastructure element set (Roads,
--       Earthworks, Sewerage, …) — have NO currency at all.
--     • "Kingdom of Saudi Arabia" duplicates "KSA" (6 projects).
--
-- WHAT (safe, factual: UAE→AED, KSA→SAR; the label pairs are the same place)
--   1. Backfill the country's currency where missing.
--   2. Merge duplicate country labels onto the short canonical (UAE, KSA).
--
--   The 6 projects with no country and a junk "0" currency are left untouched
--   (not identifiable).
--
-- Idempotent: re-running is a no-op once applied. Wrapped in a txn.
-- ─────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. Backfill currency by country ------------------------------------------
UPDATE rates_dim_project
SET    currency_id = (SELECT id FROM rates_dim_currency WHERE iso4217 = 'AED' LIMIT 1)
WHERE  currency_id IS NULL
  AND  country_id IN (SELECT id FROM rates_dim_country WHERE name IN ('UAE', 'United Arab Emirates'));

UPDATE rates_dim_project
SET    currency_id = (SELECT id FROM rates_dim_currency WHERE iso4217 = 'SAR' LIMIT 1)
WHERE  currency_id IS NULL
  AND  country_id IN (SELECT id FROM rates_dim_country WHERE name IN ('KSA', 'Kingdom of Saudi Arabia', 'Saudi Arabia'));

-- 2. Merge duplicate country labels onto the canonical short code -----------
UPDATE rates_dim_project
SET    country_id = (SELECT id FROM rates_dim_country WHERE name = 'UAE' LIMIT 1)
WHERE  country_id = (SELECT id FROM rates_dim_country WHERE name = 'United Arab Emirates' LIMIT 1)
  AND  EXISTS (SELECT 1 FROM rates_dim_country WHERE name = 'UAE');

UPDATE rates_dim_project
SET    country_id = (SELECT id FROM rates_dim_country WHERE name = 'KSA' LIMIT 1)
WHERE  country_id = (SELECT id FROM rates_dim_country WHERE name = 'Kingdom of Saudi Arabia' LIMIT 1)
  AND  EXISTS (SELECT 1 FROM rates_dim_country WHERE name = 'KSA');

COMMIT;
