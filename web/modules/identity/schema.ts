import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import type { AdapterAccountType } from "next-auth/adapters"

/**
 * The single IOX-wide role. `superadmin` has access to everything in every
 * module (no per-module silos); `director` and `user` are normal members who
 * can use every module. Capability flags (e.g. `aiAssistantTester`) gate
 * specific features on top of the role.
 */
export const userRoleEnum = pgEnum("px_user_role", [
  "superadmin",
  "director",
  "user",
])

export type UserRole = (typeof userRoleEnum.enumValues)[number]

// Auth.js standard tables (https://authjs.dev/reference/adapter/drizzle).
// Extended with our app-specific fields (password_hash for credentials,
// is_dev_seed for the dev role quick-fill flow).

export const users = pgTable("px_user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),

  // Credentials provider (dev quick-fills + future email/password)
  passwordHash: text("password_hash"),

  // IOX-wide authorisation
  role: userRoleEnum("role").notNull().default("user"),
  /** Capability flag: may use the RatesX AI assistant (managed by superadmin). */
  aiAssistantTester: boolean("ai_assistant_tester").notNull().default(false),

  // Dev / seed marker — gates the quick-fill panel
  isDevSeed: boolean("is_dev_seed").default(false).notNull(),
  devRoleLabel: text("dev_role_label"),

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
})

export const accounts = pgTable(
  "px_account",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
)

export const sessions = pgTable("px_session", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
})

export const verificationTokens = pgTable(
  "px_verification_token",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
)

// One row per RatesX AI turn (every question/answer), logged regardless of
// feedback — powers the experiment dashboard (volume, tokens, per-user, etc.).
export const ratesMessage = pgTable("px_rates_message", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  userEmail: text("user_email"),
  question: text("question"),
  answer: text("answer"),
  tokensIn: integer("tokens_in").notNull().default(0),
  tokensOut: integer("tokens_out").notNull().default(0),
  toolCalls: jsonb("tool_calls"), // [{ name, noData }]
  toolCount: integer("tool_count").notNull().default(0),
  latencyMs: integer("latency_ms").notNull().default(0),
  error: boolean("error").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
})

// User feedback on RatesX AI answers. A thumbs-down captures a free-text
// reason; superadmins review these in /platform/feedback. Linked to the
// message it rates so we can show "answered but no feedback".
export const ratesFeedback = pgTable("px_rates_feedback", {
  id: text("id").primaryKey(),
  messageId: text("message_id").references(() => ratesMessage.id, {
    onDelete: "set null",
  }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  userEmail: text("user_email"),
  vote: text("vote").notNull(), // "up" | "down"
  reason: text("reason"),
  question: text("question"),
  answer: text("answer"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type RatesFeedback = typeof ratesFeedback.$inferSelect
export type RatesMessage = typeof ratesMessage.$inferSelect
