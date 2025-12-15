import { relations } from "drizzle-orm";
import {
	boolean,
	pgEnum,
	pgTable,
	primaryKey,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { OrganizationsTable } from "./organizations-table";
import { createdAt, updatedAt } from "./schema-helpers";
import { UsersTable } from "./users-table";

export const organizationMembershipStatusValues = [
	"pending",
	"active",
	"inactive",
] as const;
export type OrganizationMembershipStatus =
	(typeof organizationMembershipStatusValues)[number];
export const organizationMembershipStatusEnum = pgEnum(
	"org_membership_status",
	organizationMembershipStatusValues,
);

export const OrganizationMembershipsTable = pgTable(
	"organization_memberships",
	{
		organizationId: uuid()
			.notNull()
			.references(() => OrganizationsTable.id, { onDelete: "cascade" }),
		userId: uuid()
			.notNull()
			.references(() => UsersTable.id, { onDelete: "cascade" }),
		status: organizationMembershipStatusEnum().notNull().default("pending"),
		isDefault: boolean().notNull().default(false),
		invitedByUserId: uuid().references(() => UsersTable.id, {
			onDelete: "set null",
		}),
		joinedAt: timestamp({ withTimezone: true }).defaultNow(),
		createdAt,
		updatedAt,
	},
	(table) => [primaryKey({ columns: [table.organizationId, table.userId] })],
);

export const organizationMembershipRelations = relations(
	OrganizationMembershipsTable,
	({ one }) => ({
		organization: one(OrganizationsTable, {
			fields: [OrganizationMembershipsTable.organizationId],
			references: [OrganizationsTable.id],
		}),
		user: one(UsersTable, {
			fields: [OrganizationMembershipsTable.userId],
			references: [UsersTable.id],
		}),
		invitedBy: one(UsersTable, {
			fields: [OrganizationMembershipsTable.invitedByUserId],
			references: [UsersTable.id],
			relationName: "organizationInvitations",
		}),
	}),
);

export type OrganizationMembership =
	typeof OrganizationMembershipsTable.$inferSelect;
export type NewOrganizationMembership =
	typeof OrganizationMembershipsTable.$inferInsert;
