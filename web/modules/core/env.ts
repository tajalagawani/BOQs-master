import { z } from "zod"

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Neon Postgres (provisioned via Vercel Marketplace)
  DATABASE_URL: z.string().url(),
  DATABASE_URL_UNPOOLED: z.string().url(),

  // Auth.js
  AUTH_SECRET: z.string().min(16),

  /**
   * Microsoft Entra ID (Azure AD) SSO. All optional so the app still boots in
   * dev without SSO configured — the provider is only registered when the
   * client id is present. Issuer is `https://login.microsoftonline.com/<tenant>/v2.0`
   * (or `.../common/v2.0` for multi-tenant).
   */
  AUTH_MICROSOFT_ENTRA_ID_ID: z.string().optional(),
  AUTH_MICROSOFT_ENTRA_ID_SECRET: z.string().optional(),
  AUTH_MICROSOFT_ENTRA_ID_ISSUER: z.string().url().optional(),

  /**
   * Comma-separated email allowlist. Any user signing in with one of these
   * emails is promoted to `superadmin` (full access to every module). The
   * first superadmin is bootstrapped this way.
   */
  SUPERADMIN_EMAILS: z.string().default(""),

  /**
   * Show the dev quick-fill login (seeded `is_dev_seed` accounts, password
   * "dev") even in production. Default false. Only enable for internal testing
   * — these are weak credentials; turn it off once SSO / real accounts exist.
   */
  ALLOW_DEV_LOGIN: z
    .preprocess(
      (v) => (typeof v === "string" ? v.toLowerCase() === "true" || v === "1" : v),
      z.boolean(),
    )
    .default(false),

  // Anthropic — direct provider for the document-extraction agent.
  // The agent uses adaptive thinking + prompt caching + 128k output beta,
  // which require direct SDK access (see docs/AI_AGENT_MIGRATION_PLAN.md).
  ANTHROPIC_API_KEY: z.string().min(10),
  AI_DEFAULT_MODEL: z.string().default("claude-sonnet-4-6"),
  /**
   * Model used by the chunked extractor specifically. Defaults to
   * Haiku 4.5 — the chunked path makes hundreds of structured-JSON
   * calls per large doc and is dominated by per-call cost / latency.
   * Set to `claude-sonnet-4-6` (or another) only if Haiku's accuracy
   * on your specs proves insufficient.
   */
  AI_CHUNKED_MODEL: z.string().default("claude-haiku-4-5"),
  AI_DEFAULT_EFFORT: z
    .enum(["low", "medium", "high", "xhigh", "max"])
    .default("medium"),
  AI_MAX_ITERATIONS: z.coerce.number().int().positive().default(500),
  AI_MAX_TOKENS: z.coerce.number().int().positive().default(32_000),

  /**
   * Hard cap on the number of top-level units the chunked path will
   * actually extract. Useful for dev to keep costs/time bounded on
   * huge docs (e.g. set to 49 to extract only the first 49 pages of
   * a 288-page Technical Specification). Default 0 = unlimited
   * (production behaviour). When a cap kicks in:
   *   - the run still succeeds if all processed units succeed,
   *   - the verdict is marked `cache_eligible: false` so a capped
   *     dev result never poisons a future full-doc run,
   *   - skipped unit ids are recorded in `coverage.json.units_skipped`.
   */
  AI_CHUNKED_MAX_UNITS: z.coerce.number().int().nonnegative().default(0),

  /**
   * Disable the optional Anthropic Haiku call that classifies dropped
   * files in the bulk-upload zone (`modules/ai-extraction/actions.ts`).
   * When true, classification falls back to the deterministic
   * fingerprint detector — no quota burned per upload. Recommended for
   * dev or when account usage is capped. Default false (uses Haiku).
   */
  AI_CLASSIFY_DISABLED: z
    .preprocess(
      (v) => (typeof v === "string" ? v.toLowerCase() === "true" : v),
      z.boolean(),
    )
    .default(false),

  // Vercel Blob (file storage)
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
})

export const env = schema.parse(process.env)

export type Env = z.infer<typeof schema>
