import { pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";

import { PermissionsTable } from "./permissions-table";
import { RolesTable } from "./roles-table";

export const RolePermissionsTable = pgTable(
	"auth_role_permissions",
	{
		roleId: uuid()
			.notNull()
			.references(() => RolesTable.id, { onDelete: "cascade" }),
		permissionId: uuid()
			.notNull()
			.references(() => PermissionsTable.id, { onDelete: "cascade" }),
		createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [primaryKey({ columns: [table.roleId, table.permissionId] })],
);
