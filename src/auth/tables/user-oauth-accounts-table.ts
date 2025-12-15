import { relations } from "drizzle-orm";
import {
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { createdAt, updatedAt } from "./schema-helpers";
import { UsersTable } from "./users-table";

export const oAuthProviderValues = ["google", "github", "microsoft"] as const;
export type OAuthProvider = (typeof oAuthProviderValues)[number];
export const oAuthProviderEnum = pgEnum("oauth_provider", oAuthProviderValues);

export const UserOAuthAccountsTable = pgTable(
	"user_oauth_accounts",
	{
		userId: uuid()
			.notNull()
			.references(() => UsersTable.id, { onDelete: "cascade" }),
		createdAt,
		updatedAt,

		provider: oAuthProviderEnum().notNull(),
		providerAccountId: text().notNull(),
		displayName: text(),
		profileUrl: text(),
		accessToken: text(),
		refreshToken: text(),
		scopes: jsonb().$type<string[]>(),
		expiresAt: timestamp({ withTimezone: true }),
	},
	(t) => [
		primaryKey({ columns: [t.providerAccountId, t.provider] }),
		uniqueIndex("user_oauth_accounts_user_provider_unique").on(
			t.userId,
			t.provider,
		),
	],
);

export const userOAuthAccountRelations = relations(
	UserOAuthAccountsTable,
	({ one }) => ({
		user: one(UsersTable, {
			fields: [UserOAuthAccountsTable.userId],
			references: [UsersTable.id],
		}),
	}),
);

export type UserOAuthAccount = typeof UserOAuthAccountsTable.$inferSelect;
export type NewUserOAuthAccount = typeof UserOAuthAccountsTable.$inferInsert;
