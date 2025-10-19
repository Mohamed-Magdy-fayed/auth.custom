import { relations } from "drizzle-orm"

import { BiometricCredentialsTable } from "./biometric-credentials-table"
import { OrganizationMembershipsTable } from "./organization-memberships-table"
import { OrganizationsTable } from "./organizations-table"
import { PermissionsTable } from "./permissions-table"
import { RolePermissionsTable } from "./role-permissions-table"
import { RolesTable } from "./roles-table"
import { SessionsTable } from "./sessions-table"
import { TeamMembershipsTable } from "./team-memberships-table"
import { TeamsTable } from "./teams-table"
import { UserCredentialsTable } from "./user-credentials-table"
import { UserOAuthAccountsTable } from "./user-oauth-accounts-table"
import { UserRoleAssignmentsTable } from "./user-role-assignments-table"
import { UserTokensTable } from "./user-tokens-table"
import { UsersTable } from "./users-table"

export const usersRelations = relations(UsersTable, ({ many, one }) => ({
    credentials: one(UserCredentialsTable, {
        fields: [UsersTable.id],
        references: [UserCredentialsTable.userId],
    }),
    oauthAccounts: many(UserOAuthAccountsTable),
    sessions: many(SessionsTable),
    organizationMemberships: many(OrganizationMembershipsTable),
    teamMemberships: many(TeamMembershipsTable),
    roleAssignments: many(UserRoleAssignmentsTable, {
        relationName: "userRoleAssignments",
    }),
    tokens: many(UserTokensTable),
    biometricCredentials: many(BiometricCredentialsTable),
}))

export const userCredentialsRelations = relations(
    UserCredentialsTable,
    ({ one }) => ({
        user: one(UsersTable, {
            fields: [UserCredentialsTable.userId],
            references: [UsersTable.id],
        }),
    })
)

export const userOAuthAccountRelations = relations(
    UserOAuthAccountsTable,
    ({ one }) => ({
        user: one(UsersTable, {
            fields: [UserOAuthAccountsTable.userId],
            references: [UsersTable.id],
        }),
    })
)

export const sessionsRelations = relations(SessionsTable, ({ one }) => ({
    user: one(UsersTable, {
        fields: [SessionsTable.userId],
        references: [UsersTable.id],
    }),
    revokedBy: one(UsersTable, {
        fields: [SessionsTable.revokedBy],
        references: [UsersTable.id],
        relationName: "revokedSessions",
    }),
}))

export const organizationsRelations = relations(
    OrganizationsTable,
    ({ many, one }) => ({
        memberships: many(OrganizationMembershipsTable),
        teams: many(TeamsTable),
        roles: many(RolesTable),
        createdBy: one(UsersTable, {
            fields: [OrganizationsTable.createdById],
            references: [UsersTable.id],
        }),
    })
)

export const organizationMembershipRelations = relations(
    OrganizationMembershipsTable,
    ({ one }) => ({
        user: one(UsersTable, {
            fields: [OrganizationMembershipsTable.userId],
            references: [UsersTable.id],
        }),
        organization: one(OrganizationsTable, {
            fields: [OrganizationMembershipsTable.organizationId],
            references: [OrganizationsTable.id],
        }),
        role: one(RolesTable, {
            fields: [OrganizationMembershipsTable.roleId],
            references: [RolesTable.id],
        }),
        invitedBy: one(UsersTable, {
            fields: [OrganizationMembershipsTable.invitedById],
            references: [UsersTable.id],
            relationName: "organizationInvitations",
        }),
    })
)

export const teamsRelations = relations(TeamsTable, ({ many, one }) => ({
    organization: one(OrganizationsTable, {
        fields: [TeamsTable.organizationId],
        references: [OrganizationsTable.id],
    }),
    parent: one(TeamsTable, {
        fields: [TeamsTable.parentTeamId],
        references: [TeamsTable.id],
        relationName: "teamParent",
    }),
    children: many(TeamsTable, {
        relationName: "teamParent",
    }),
    memberships: many(TeamMembershipsTable),
}))

export const teamMembershipRelations = relations(
    TeamMembershipsTable,
    ({ one }) => ({
        team: one(TeamsTable, {
            fields: [TeamMembershipsTable.teamId],
            references: [TeamsTable.id],
        }),
        user: one(UsersTable, {
            fields: [TeamMembershipsTable.userId],
            references: [UsersTable.id],
        }),
        role: one(RolesTable, {
            fields: [TeamMembershipsTable.roleId],
            references: [RolesTable.id],
        }),
    })
)

export const rolesRelations = relations(RolesTable, ({ many, one }) => ({
    organization: one(OrganizationsTable, {
        fields: [RolesTable.organizationId],
        references: [OrganizationsTable.id],
    }),
    permissions: many(RolePermissionsTable),
    organizationMemberships: many(OrganizationMembershipsTable),
    teamMemberships: many(TeamMembershipsTable),
    assignments: many(UserRoleAssignmentsTable),
}))

export const permissionsRelations = relations(PermissionsTable, ({ many }) => ({
    roles: many(RolePermissionsTable),
}))

export const rolePermissionsRelations = relations(
    RolePermissionsTable,
    ({ one }) => ({
        role: one(RolesTable, {
            fields: [RolePermissionsTable.roleId],
            references: [RolesTable.id],
        }),
        permission: one(PermissionsTable, {
            fields: [RolePermissionsTable.permissionId],
            references: [PermissionsTable.id],
        }),
    })
)

export const userRoleAssignmentsRelations = relations(
    UserRoleAssignmentsTable,
    ({ one }) => ({
        user: one(UsersTable, {
            fields: [UserRoleAssignmentsTable.userId],
            references: [UsersTable.id],
            relationName: "userRoleAssignments",
        }),
        role: one(RolesTable, {
            fields: [UserRoleAssignmentsTable.roleId],
            references: [RolesTable.id],
        }),
        organization: one(OrganizationsTable, {
            fields: [UserRoleAssignmentsTable.organizationId],
            references: [OrganizationsTable.id],
        }),
        team: one(TeamsTable, {
            fields: [UserRoleAssignmentsTable.teamId],
            references: [TeamsTable.id],
        }),
        assignedBy: one(UsersTable, {
            fields: [UserRoleAssignmentsTable.assignedById],
            references: [UsersTable.id],
            relationName: "roleAssignmentsIssued",
        }),
    })
)

export const userTokensRelations = relations(UserTokensTable, ({ one }) => ({
    user: one(UsersTable, {
        fields: [UserTokensTable.userId],
        references: [UsersTable.id],
    }),
}))

export const biometricCredentialsRelations = relations(
    BiometricCredentialsTable,
    ({ one }) => ({
        user: one(UsersTable, {
            fields: [BiometricCredentialsTable.userId],
            references: [UsersTable.id],
        }),
    })
)
