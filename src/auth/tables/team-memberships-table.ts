import {
    boolean,
    pgEnum,
    pgTable,
    primaryKey,
    text,
    timestamp,
    uuid,
} from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "@/auth/tables/schema-helpers";
import { RolesTable } from "./roles-table";
import { TeamsTable } from "./teams-table";
import { UsersTable } from "./users-table";

export const teamMembershipStatusValues = [
    "pending",
    "active",
    "inactive",
] as const;
export type TeamMembershipStatus = (typeof teamMembershipStatusValues)[number];
export const teamMembershipStatusEnum = pgEnum(
    "auth_team_membership_status",
    teamMembershipStatusValues,
);

export const TeamMembershipsTable = pgTable(
    "auth_team_memberships",
    {
        createdAt,
        updatedAt,

        teamId: uuid()
            .notNull()
            .references(() => TeamsTable.id, { onDelete: "cascade" }),
        userId: uuid()
            .notNull()
            .references(() => UsersTable.id, { onDelete: "cascade" }),
        roleId: uuid().references(() => RolesTable.id, { onDelete: "set null" }),
        customTitle: text(),
        status: teamMembershipStatusEnum().notNull().default("pending"),
        isManager: boolean().notNull().default(false),
        joinedAt: timestamp({ withTimezone: true }),
    },
    (table) => [primaryKey({ columns: [table.teamId, table.userId] })],
);
