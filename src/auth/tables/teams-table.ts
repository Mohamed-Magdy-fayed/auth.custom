import {
    foreignKey,
    pgTable,
    text,
    uuid,
} from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "@/auth/tables/schema-helpers";
import { OrganizationsTable } from "./organizations-table";

export const TeamsTable = pgTable(
    "auth_teams",
    {
        id,
        createdAt,
        updatedAt,
        organizationId: uuid()
            .notNull()
            .references(() => OrganizationsTable.id, { onDelete: "cascade" }),
        parentTeamId: uuid(),
        name: text().notNull(),
        slug: text().notNull().unique(),
        description: text(),
    },
    (table) => [{
        parentFk: foreignKey({
            name: "auth_teams_parent_fk",
            columns: [table.parentTeamId],
            foreignColumns: [table.id],
        }).onDelete("cascade"),
    }],
);
