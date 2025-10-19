import { oAuthProviderValues } from "@/auth/tables"

const basePermissionKeys = [
    "org:create",
    "org:update",
    "org:delete",
    "org:invite",
    "org:roles",
    "org:teams",
    "org:sessions",
    "team:create",
    "team:update",
    "team:delete",
    "team:members",
    "role:create",
    "role:update",
    "role:delete",
    "member:assign-role",
    "member:remove",
    "member:update",
    "session:revoke",
    "auth:provider:link",
    "auth:provider:unlink",
] as const

const providerPermissionKeys = oAuthProviderValues.map(
    provider => `auth:provider:${provider}` as const
)

export const PERMISSION_KEYS = [
    ...basePermissionKeys,
    ...providerPermissionKeys,
] as const

export type PermissionKey = (typeof PERMISSION_KEYS)[number]

export type PermissionCategory =
    | "Workspace"
    | "Teams"
    | "Members"
    | "Security"
    | "Authentication"

export type PermissionDefinition = {
    key: PermissionKey
    label: string
    description: string
    category: PermissionCategory
}

const basePermissionDefinitions: PermissionDefinition[] = [
    {
        key: "org:create",
        label: "Create organizations",
        description: "Create new organizations",
        category: "Workspace",
    },
    {
        key: "org:update",
        label: "Update organization settings",
        description: "Update organization settings",
        category: "Workspace",
    },
    {
        key: "org:delete",
        label: "Delete organizations",
        description: "Delete organizations",
        category: "Workspace",
    },
    {
        key: "org:invite",
        label: "Invite members",
        description: "Invite members to the organization",
        category: "Members",
    },
    {
        key: "org:roles",
        label: "Manage roles",
        description: "Manage organization roles",
        category: "Members",
    },
    {
        key: "org:teams",
        label: "Manage teams",
        description: "Manage organization teams",
        category: "Teams",
    },
    {
        key: "org:sessions",
        label: "Review sessions",
        description: "Review organization sessions",
        category: "Security",
    },
    {
        key: "team:create",
        label: "Create teams",
        description: "Create teams",
        category: "Teams",
    },
    {
        key: "team:update",
        label: "Update teams",
        description: "Update teams",
        category: "Teams",
    },
    {
        key: "team:delete",
        label: "Delete teams",
        description: "Delete teams",
        category: "Teams",
    },
    {
        key: "team:members",
        label: "Manage team memberships",
        description: "Manage team memberships",
        category: "Members",
    },
    {
        key: "role:create",
        label: "Create roles",
        description: "Create roles",
        category: "Members",
    },
    {
        key: "role:update",
        label: "Update roles",
        description: "Update roles",
        category: "Members",
    },
    {
        key: "role:delete",
        label: "Delete roles",
        description: "Delete roles",
        category: "Members",
    },
    {
        key: "member:assign-role",
        label: "Assign member roles",
        description: "Assign roles to members",
        category: "Members",
    },
    {
        key: "member:remove",
        label: "Remove members",
        description: "Remove members",
        category: "Members",
    },
    {
        key: "member:update",
        label: "Update member status",
        description: "Update membership status",
        category: "Members",
    },
    {
        key: "session:revoke",
        label: "Revoke sessions",
        description: "Revoke sessions",
        category: "Security",
    },
    {
        key: "auth:provider:link",
        label: "Link providers",
        description: "Link authentication providers",
        category: "Authentication",
    },
    {
        key: "auth:provider:unlink",
        label: "Unlink providers",
        description: "Unlink authentication providers",
        category: "Authentication",
    },
]

const capitalize = (value: string) =>
    value.charAt(0).toUpperCase() + value.slice(1)

const providerPermissionDefinitions: PermissionDefinition[] = oAuthProviderValues.map(
    provider => ({
        key: `auth:provider:${provider}` as const,
        label: `${capitalize(provider)} authentication`,
        description: `Use ${capitalize(provider)} authentication`,
        category: "Authentication",
    })
)

export const permissionDefinitions: PermissionDefinition[] = [
    ...basePermissionDefinitions,
    ...providerPermissionDefinitions,
]

export const permissionDescriptions: Record<PermissionKey, string> =
    Object.fromEntries(
        permissionDefinitions.map(definition => [definition.key, definition.description])
    ) as Record<PermissionKey, string>

export const OWNER_ROLE_KEY = "owner"

export type OrgMembershipLike = {
    status?: string | null
    role?: { key?: string | null } | null
    roleKey?: string | null
}

export type TeamMembershipLike = {
    status?: string | null
    isManager?: boolean | null
}

export function isActiveOrgMembership(membership: OrgMembershipLike | null | undefined) {
    return membership?.status === "active"
}

export function isOwnerMembership(membership: OrgMembershipLike | null | undefined) {
    if (!isActiveOrgMembership(membership)) {
        return false
    }

    const roleKey = membership?.role?.key ?? membership?.roleKey ?? null
    return roleKey === OWNER_ROLE_KEY
}

export function isActiveTeamManager(membership: TeamMembershipLike | null | undefined) {
    return membership?.status === "active" && membership?.isManager === true
}

export function canCreateTeamFromMembership(membership: OrgMembershipLike | null | undefined) {
    return isOwnerMembership(membership)
}

export function canManageTeamMembersFromMemberships(params: {
    organizationMembership: OrgMembershipLike | null | undefined
    teamMembership: TeamMembershipLike | null | undefined
}) {
    return (
        isOwnerMembership(params.organizationMembership) ||
        isActiveTeamManager(params.teamMembership)
    )
}
