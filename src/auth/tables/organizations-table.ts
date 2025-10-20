import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { UsersTable } from "./users-table";

export const OrganizationsTable = pgTable("auth_organizations", {
	id: uuid().primaryKey().defaultRandom(),
	name: text().notNull(),
	slug: text().notNull().unique(),
	description: text(),
	metadata: jsonb().$type<Record<string, unknown>>(),
	createdById: uuid().references(() => UsersTable.id, { onDelete: "set null" }),
	createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp({ withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
});
