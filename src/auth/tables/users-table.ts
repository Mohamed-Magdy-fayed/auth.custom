import { relations } from "drizzle-orm";
import {
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { ActivityLogsTable } from "@/saas/tables/activity-logs-table";
import { InvitationsTable } from "@/saas/tables/invitations-table";
import { BiometricCredentialsTable } from "./biometric-credentials-table";
import { OrganizationMembershipsTable } from "./organization-memberships-table";
import { createdAt, id, updatedAt } from "./schema-helpers";
import { UserCredentialsTable } from "./user-credentials-table";
import { UserOAuthAccountsTable } from "./user-oauth-accounts-table";
import { UserTokensTable } from "./user-tokens-table";

export const userStatusValues = [
	"active",
	"invited",
	"inactive",
	"suspended",
] as const;
export type UserStatus = (typeof userStatusValues)[number];
export const userStatusEnum = pgEnum("user_status", userStatusValues);

export const UsersTable = pgTable(
	"users",
	{
		id,
		email: text().notNull(),
		emailNormalized: text().notNull(),
		displayName: text(),
		name: text(),
		givenName: text(),
		familyName: text(),
		avatarUrl: text(),
		locale: text(),
		timezone: text(),
		status: userStatusEnum().notNull().default("active"),
		emailVerifiedAt: timestamp({ withTimezone: true }),
		lastSignInAt: timestamp({ withTimezone: true }),
		createdAt,
		updatedAt,
	},
	(table) => [
		uniqueIndex("users_email_normalized_unique").on(table.emailNormalized),
	],
);

export const usersRelations = relations(UsersTable, ({ many, one }) => ({
	credentials: one(UserCredentialsTable, {
		fields: [UsersTable.id],
		references: [UserCredentialsTable.userId],
	}),
	oauthAccounts: many(UserOAuthAccountsTable),
	organizationMemberships: many(OrganizationMembershipsTable),
	tokens: many(UserTokensTable),
	biometricCredentials: many(BiometricCredentialsTable),
	activityLogs: many(ActivityLogsTable),
	invitationsSent: many(InvitationsTable, { relationName: "invitationSender" }),
}));

export type User = typeof UsersTable.$inferSelect;
export type NewUser = typeof UsersTable.$inferInsert;
