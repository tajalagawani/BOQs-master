// Hardcoded super-admins. These emails are ALWAYS promoted to `superadmin` on
// sign-in, regardless of the SUPERADMIN_EMAILS env var. Merged with the env
// allowlist by auth.ts (promotion) and authz.ts (gating). Lower-cased so
// matching is case-insensitive.
export const HARDCODED_SUPERADMIN_EMAILS: string[] = [
  "taj@iox-1.dev",
].map((e) => e.trim().toLowerCase());
