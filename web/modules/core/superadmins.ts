// Hardcoded super-admins. These emails are ALWAYS promoted to `superadmin` on
// sign-in, regardless of the SUPERADMIN_EMAILS env var. Merged with the env
// allowlist by auth.ts (promotion) and authz.ts (gating). Lower-cased so
// matching is case-insensitive.
export const HARDCODED_SUPERADMIN_EMAILS: string[] = [
  "antonio.resurreccion@omniumint.com",
  "matthew.eastwood@omniumint.com",
  "jeffrey.zacarias@omniumint.com",
  "ruslan.leonte@omniumint.com",
  "dalton.issac@omniumint.com",
  "kshitija.narkhede@omniumint.com",
  "bryan.imperial@omniumint.com",
  "mary.ibanez@omniumint.com",
  "kevin.athukorala@omniumint.com",
  "sheena.rellorosa@omniumint.com",
  "nicky.dobreanu@omniumint.com",
  "robert.halley@omniumint.com",
].map((e) => e.trim().toLowerCase());
