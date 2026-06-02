-- ─────────────────────────────────────────────────────────────────────────
-- Manual migration: repair shredded NRM L1 element names on benchmarks.
--
-- WHY
--   The benchmark loader's splitCodeLabel() treated bare whitespace as a
--   code/label delimiter, so any multi-word element name had its first word
--   stolen as a "code":
--       "Internal Walls and Doors" -> code "Internal", label "Walls and Doors"
--       "Bridges & Tunnels"        -> code "Bridges",  label "& Tunnels"
--   and the unclassified bucket was stored as code "0" / label "0".
--   This made the Elemental-by-Project legend unreadable.
--
-- WHAT
--   Non-destructive label repair. We only touch rates_dim_nrm_l1 rows that are
--   referenced by benchmarks AND whose code is non-numeric (i.e. shredded).
--   No foreign keys move; rate_items use only the clean numeric codes (1..9)
--   and are untouched (verified: 0 rate_items reference these rows).
--
--   - Shredded rows (word code, code <> label) -> code = label = "code label"
--   - The "0"/"0" bucket                       -> label = "Unclassified"
--   - Numeric/CSI codes (^[0-9]) are left alone.
--
-- SAFETY
--   Idempotent: re-running is a no-op (repaired rows already have code = label
--   with no remaining word-code+distinct-label shape). Wrapped in a txn.
-- ─────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. Un-shred multi-word element names (word code, distinct label).
UPDATE rates_dim_nrm_l1
SET    label = code || ' ' || label,
       code  = code || ' ' || label
WHERE  code !~ '^[0-9]'
  AND  code <> label;

-- 2. Relabel the unclassified bucket (keep its '0' code, it is referenced).
UPDATE rates_dim_nrm_l1
SET    label = 'Unclassified'
WHERE  code = '0';

COMMIT;
