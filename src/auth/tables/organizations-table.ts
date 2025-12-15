import { relations } from "drizzle-orm";
import { jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { OrganizationMembershipsTable } from "./organization-memberships-table";
import { createdAt, id, updatedAt } from "./schema-helpers";
import { UsersTable } from "./users-table";

export const OrganizationsTable = pgTable("organizations", {
	id,
	name: text().notNull(),
	slug: text().notNull().unique(),
	description: text(),
	metadata: jsonb().$type<Record<string, unknown>>(),
	createdById: uuid().references(() => UsersTable.id, { onDelete: "set null" }),
	createdAt,
	updatedAt,
});

export const organizationsRelations = relations(
	OrganizationsTable,
	({ many, one }) => ({
		memberships: many(OrganizationMembershipsTable),
		createdBy: one(UsersTable, {
			fields: [OrganizationsTable.createdById],
			references: [UsersTable.id],
		}),
	}),
);

export type Organization = typeof OrganizationsTable.$inferSelect;
export type NewOrganization = typeof OrganizationsTable.$inferInsert;
