import { relations } from "drizzle-orm";
import { jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { createdAt, id, userId } from "./schema-helpers";
import { UsersTable } from "./users-table";

export const userTokenTypeValues = [
	"email_verification",
	"password_reset",
	"magic_link",
	"otp",
	"device_trust",
] as const;
export type UserTokenType = (typeof userTokenTypeValues)[number];
export const userTokenTypeEnum = pgEnum("user_token_type", userTokenTypeValues);

export const UserTokensTable = pgTable("user_tokens", {
	id,
	userId: userId.references(() => UsersTable.id, { onDelete: "cascade" }),
	createdAt,

	tokenHash: text().notNull().unique(),
	type: userTokenTypeEnum().notNull(),
	expiresAt: timestamp({ withTimezone: true }).notNull(),
	consumedAt: timestamp({ withTimezone: true }),
	metadata: jsonb()
		.$type<Record<string, unknown> | null>()
		.default(null),
});

export const userTokensRelations = relations(UserTokensTable, ({ one }) => ({
	user: one(UsersTable, {
		fields: [UserTokensTable.userId],
		references: [UsersTable.id],
	}),
}));

export type UserToken = typeof UserTokensTable.$inferSelect;
export type NewUserToken = typeof UserTokensTable.$inferInsert;
