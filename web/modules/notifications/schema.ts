import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

import { users } from "@/modules/identity/schema"
import { workspaces } from "@/modules/workspace/schema"

export const notificationChannelEnum = pgEnum("notification_channel", [
  "in_app",
  "email",
])

export const notificationStatusEnum = pgEnum("notification_status", [
  "pending",
  "sent",
  "read",
  "failed",
])

export const notifications = pgTable(
  "px_notification",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id"),

    kind: text("kind").notNull(),
    payload: jsonb("payload"),

    channel: notificationChannelEnum("channel").notNull().default("in_app"),
    status: notificationStatusEnum("status").notNull().default("pending"),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    sentAt: timestamp("sent_at", { mode: "date" }),
    readAt: timestamp("read_at", { mode: "date" }),
  },
  (t) => [
    index("notification_user_idx").on(t.userId, t.createdAt),
    index("notification_workspace_idx").on(t.workspaceId, t.createdAt),
    index("notification_unread_idx").on(t.userId, t.status),
  ],
)

export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert
