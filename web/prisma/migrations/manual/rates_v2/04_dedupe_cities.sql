-- ─────────────────────────────────────────────────────────────────────────
-- Dedupe city dimension rows.
--
-- WHY  Abu Dhabi, Dubai, Jeddah and Riyadh each exist as 2–3 separate
--      rates_dim_city rows with the same name, splitting any city-level cut.
-- WHAT Repoint every project to the canonical (lowest-id) row per city name.
--      Orphaned duplicate rows are left in place (harmless — unreferenced).
-- Idempotent.
-- ─────────────────────────────────────────────────────────────────────────

BEGIN;

WITH canon AS (
  SELECT name, (array_agg(id ORDER BY id::text))[1] AS keep_id
  FROM rates_dim_city
  GROUP BY name
  HAVING count(*) > 1
)
UPDATE rates_dim_project p
SET    city_id = canon.keep_id
FROM   rates_dim_city c
JOIN   canon ON canon.name = c.name
WHERE  p.city_id = c.id
  AND  c.id <> canon.keep_id;

COMMIT;
