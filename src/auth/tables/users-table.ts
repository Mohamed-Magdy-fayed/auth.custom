import { pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core"

import { createdAt, id, updatedAt } from "./schema-helpers"

export const userStatusValues = ["active", "invited", "inactive", "suspended"] as const
export type UserStatus = (typeof userStatusValues)[number]
export const userStatusEnum = pgEnum("auth_user_status", userStatusValues)

export const UsersTable = pgTable(
    "auth_users",
    {
        id,
        email: text("email").notNull(),
        emailNormalized: text("email_normalized").notNull(),
        displayName: text("display_name"),
        name: text("name"),
        givenName: text("given_name"),
        familyName: text("family_name"),
        avatarUrl: text("avatar_url"),
        locale: text("locale"),
        timezone: text("timezone"),
        status: userStatusEnum().notNull().default("active"),
        emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
        lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true }),
        createdAt,
        updatedAt,
    },
    table => ({
        emailNormalizedUnique: uniqueIndex("auth_users_email_normalized_unique").on(table.emailNormalized),
    })
)
