import {
	foreignKey,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { id, userId } from "@/auth/tables/schema-helpers";
import { OrganizationsTable } from "./organizations-table";
import { RolesTable } from "./roles-table";
import { TeamsTable } from "./teams-table";
import { UsersTable } from "./users-table";

export const UserRoleAssignmentsTable = pgTable(
	"auth_user_role_assignments",
	{
		id,
		userId,
		roleId: uuid().notNull(),
		organizationId: uuid(),
		teamId: uuid(),
		assignedById: uuid(),
		assignedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("auth_user_role_assignments_unique").on(
			table.userId,
			table.roleId,
			table.organizationId,
			table.teamId,
		),
		foreignKey({
			columns: [table.roleId],
			foreignColumns: [RolesTable.id],
			name: "user_role_assignments_role_fk",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [UsersTable.id],
			name: "user_role_assignments_user_fk",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.organizationId],
			foreignColumns: [OrganizationsTable.id],
			name: "user_role_assignments_org_fk",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.teamId],
			foreignColumns: [TeamsTable.id],
			name: "user_role_assignments_team_fk",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.assignedById],
			foreignColumns: [UsersTable.id],
			name: "user_role_assignments_assigned_by_fk",
		}).onDelete("set null"),
	],
);
