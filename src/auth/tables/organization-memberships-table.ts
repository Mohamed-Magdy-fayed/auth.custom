import { boolean, foreignKey, pgEnum, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core"

import { OrganizationsTable } from "./organizations-table"
import { RolesTable } from "./roles-table"
import { UsersTable } from "./users-table"

export const organizationMembershipStatusValues = ["pending", "active", "inactive"] as const
export type OrganizationMembershipStatus = (typeof organizationMembershipStatusValues)[number]
export const organizationMembershipStatusEnum = pgEnum(
    "auth_org_membership_status",
    organizationMembershipStatusValues
)

export const OrganizationMembershipsTable = pgTable(
    "auth_organization_memberships",
    {
        organizationId: uuid().notNull(),
        userId: uuid().notNull(),
        roleId: uuid(),
        status: organizationMembershipStatusEnum().notNull().default("pending"),
        isDefault: boolean().notNull().default(false),
        invitedById: uuid(),
        joinedAt: timestamp({ withTimezone: true }),
        createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp({ withTimezone: true })
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    table => [
        primaryKey({ columns: [table.organizationId, table.userId] }),
        foreignKey({
            columns: [table.organizationId],
            foreignColumns: [OrganizationsTable.id],
            name: "org_memberships_org_fk",
        }).onDelete("cascade"),
        foreignKey({
            columns: [table.userId],
            foreignColumns: [UsersTable.id],
            name: "org_memberships_user_fk",
        }).onDelete("cascade"),
        foreignKey({
            columns: [table.roleId],
            foreignColumns: [RolesTable.id],
            name: "org_memberships_role_fk",
        }).onDelete("set null"),
        foreignKey({
            columns: [table.invitedById],
            foreignColumns: [UsersTable.id],
            name: "org_memberships_inviter_fk",
        }).onDelete("set null"),
    ]
)
