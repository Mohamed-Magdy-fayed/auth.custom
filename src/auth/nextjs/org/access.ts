"use server"

import { cache } from "react"
import { and, eq, inArray, isNull } from "drizzle-orm"

import {
    OrganizationMembershipsTable,
    PermissionsTable,
    RolePermissionsTable,
    TeamMembershipsTable,
    UserRoleAssignmentsTable,
} from "@/auth/tables"
import { db } from "@/drizzle/db"

import { getCurrentUser } from "../currentUser"
import type { PermissionKey } from "./permissions"

function normalizePermissions(permissionKeys: Array<string | null | undefined>) {
    return Array.from(new Set(permissionKeys.filter(Boolean) as string[]))
}

async function getPermissionsForRoleIds(roleIds: string[]) {
    if (roleIds.length === 0) return [] as string[]

    const rows = await db
        .select({ permissionKey: PermissionsTable.key })
        .from(RolePermissionsTable)
        .innerJoin(
            PermissionsTable,
            eq(RolePermissionsTable.permissionId, PermissionsTable.id)
        )
        .where(inArray(RolePermissionsTable.roleId, roleIds))

    return normalizePermissions(rows.map(row => row.permissionKey))
}

export const getGlobalPermissions = cache(async () => {
    const user = await getCurrentUser({ redirectIfNotFound: true })

    const assignments = await db
        .select({ roleId: UserRoleAssignmentsTable.roleId })
        .from(UserRoleAssignmentsTable)
        .where(
            and(
                eq(UserRoleAssignmentsTable.userId, user.id),
                isNull(UserRoleAssignmentsTable.organizationId),
                isNull(UserRoleAssignmentsTable.teamId)
            )
        )

    const roleIds = normalizePermissions(
        assignments.map(assignment => assignment.roleId)
    )
    return getPermissionsForRoleIds(roleIds)
})

export const getOrganizationPermissions = cache(async (organizationId: string) => {
    const user = await getCurrentUser({ redirectIfNotFound: true })

    const memberships = await db
        .select({ roleId: OrganizationMembershipsTable.roleId })
        .from(OrganizationMembershipsTable)
        .where(
            and(
                eq(OrganizationMembershipsTable.userId, user.id),
                eq(OrganizationMembershipsTable.organizationId, organizationId)
            )
        )

    const directAssignments = await db
        .select({ roleId: UserRoleAssignmentsTable.roleId })
        .from(UserRoleAssignmentsTable)
        .where(
            and(
                eq(UserRoleAssignmentsTable.userId, user.id),
                eq(UserRoleAssignmentsTable.organizationId, organizationId)
            )
        )

    const roleIds = normalizePermissions([
        ...memberships.map(record => record.roleId),
        ...directAssignments.map(record => record.roleId),
    ])

    return getPermissionsForRoleIds(roleIds)
})

export const getTeamPermissions = cache(async (teamId: string) => {
    const user = await getCurrentUser({ redirectIfNotFound: true })

    const memberships = await db
        .select({ roleId: TeamMembershipsTable.roleId })
        .from(TeamMembershipsTable)
        .where(
            and(
                eq(TeamMembershipsTable.userId, user.id),
                eq(TeamMembershipsTable.teamId, teamId)
            )
        )

    const directAssignments = await db
        .select({ roleId: UserRoleAssignmentsTable.roleId })
        .from(UserRoleAssignmentsTable)
        .where(
            and(
                eq(UserRoleAssignmentsTable.userId, user.id),
                eq(UserRoleAssignmentsTable.teamId, teamId)
            )
        )

    const roleIds = normalizePermissions([
        ...memberships.map(record => record.roleId),
        ...directAssignments.map(record => record.roleId),
    ])
    return getPermissionsForRoleIds(roleIds)
})

export function hasPermission(
    permissions: string[] | Promise<string[]>,
    key: PermissionKey
): boolean | Promise<boolean> {
    if (permissions instanceof Promise) {
        return permissions.then(list => list.includes(key))
    }

    return permissions.includes(key)
}