import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { createdAt, id, updatedAt, userId } from "./schema-helpers"
import { UsersTable } from "./users-table"

export const sessionStatusValues = ["active", "revoked", "expired"] as const
export type SessionStatus = (typeof sessionStatusValues)[number]
export const sessionStatusEnum = pgEnum("auth_session_status", sessionStatusValues)

export const SessionsTable = pgTable(
    "auth_sessions",
    {
        id,
        userId: userId.references(() => UsersTable.id, {
            onDelete: "cascade",
        }),
        sessionTokenHash: text("session_token_hash").notNull(),
        refreshTokenHash: text("refresh_token_hash"),
        status: sessionStatusEnum().notNull().default("active"),
        expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
        lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
        revokedAt: timestamp("revoked_at", { withTimezone: true }),
        revokedBy: uuid("revoked_by").references(() => UsersTable.id, {
            onDelete: "set null",
        }),
        ipAddress: text("ip_address"),
        userAgent: text("user_agent"),
        device: text("device"),
        platform: text("platform"),
        country: text("country"),
        city: text("city"),
        createdAt,
        updatedAt,
    },
    table => [{
        userIdx: index("auth_sessions_user_idx").on(table.userId),
        statusIdx: index("auth_sessions_status_idx").on(table.status),
    }],
)
