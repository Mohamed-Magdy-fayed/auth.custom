import {
	boolean,
	pgEnum,
	pgTable,
	text,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { OrganizationsTable } from "./organizations-table";
import { createdAt, id, updatedAt } from "./schema-helpers";

export const roleScopeValues = ["system", "organization", "team"] as const;
export type RoleScope = (typeof roleScopeValues)[number];
export const roleScopeEnum = pgEnum("auth_role_scope", roleScopeValues);

export const RolesTable = pgTable(
	"auth_roles",
	{
		id,
		createdAt,
		updatedAt,
		key: text("key").notNull(),
		name: text("name").notNull(),
		description: text("description"),
		scope: roleScopeEnum().notNull().default("system"),
		organizationId: uuid("organization_id").references(
			() => OrganizationsTable.id,
			{ onDelete: "cascade" },
		),
		isDefault: boolean("is_default").notNull().default(false),
	},
	(table) => ({
		roleKeyUnique: uniqueIndex("auth_roles_key_organization_unique").on(
			table.organizationId,
			table.key,
		),
	}),
);
