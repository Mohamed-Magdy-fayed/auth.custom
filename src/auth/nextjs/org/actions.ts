"use server";

import { randomBytes } from "crypto";
import {
    and,
    eq,
    ilike,
    inArray,
    isNotNull,
    isNull,
    ne,
    or,
} from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { generateSalt, hashPassword } from "@/auth/core/passwordHasher";
import { createTokenValue, hashTokenValue } from "@/auth/core/token";
import {
    OrganizationMembershipsTable,
    OrganizationsTable,
    PermissionsTable,
    RolePermissionsTable,
    RolesTable,
    TeamMembershipsTable,
    TeamsTable,
    UserCredentialsTable,
    UserRoleAssignmentsTable,
    type UserStatus,
    UsersTable,
    UserTokensTable,
} from "@/auth/tables";
import { db } from "@/drizzle/db";
import { slugify } from "@/lib/utils";
import { getCurrentUser } from "../currentUser";
import { sendEmailVerificationEmail } from "../emails/emailVerification";
import { defaultRoleTemplates } from "./authorizationDefaults";
import {
    canCreateTeamFromMembership,
    canManageTeamMembersFromMemberships,
    isActiveTeamManager,
    isOwnerMembership,
    OWNER_ROLE_KEY,
    type PermissionDefinition,
    type PermissionKey,
    permissionDefinitions,
} from "./permissions";
import {
    type AddTeamMemberInput,
    addTeamMemberSchema,
    type CreateOrganizationInput,
    type CreateRoleInput,
    type CreateTeamInput,
    createOrganizationSchema,
    createRoleSchema,
    createTeamSchema,
    type DeleteRoleInput,
    deleteRoleSchema,
    type SearchTeamInviteesInput,
    type SetRoleDefaultInput,
    type SetRolePermissionsInput,
    type SetTeamMemberManagerInput,
    type SetTeamMemberRoleInput,
    type SyncAuthorizationInput,
    searchTeamInviteesSchema,
    setActiveOrganizationSchema,
    setRoleDefaultSchema,
    setRolePermissionsSchema,
    setTeamMemberManagerSchema,
    setTeamMemberRoleSchema,
    syncAuthorizationSchema,
    type UpdateRoleInput,
    updateRoleSchema,
} from "./schemas";
import type { AuthorizationRoleSummary, PermissionCatalogGroup } from "./types";

type OrganizationTeamSummary = {
    id: string;
    name: string;
    description: string | null;
    memberCount: number;
    isManager: boolean;
    canManageMembers: boolean;
};

const EMAIL_VERIFICATION_TOKEN_TTL_MS = 1000 * 60 * 60 * 24;

const userSelectionColumns = {
    id: true,
    email: true,
    emailNormalized: true,
    displayName: true,
    status: true,
} as const;

const userReturningColumns = {
    id: UsersTable.id,
    email: UsersTable.email,
    emailNormalized: UsersTable.emailNormalized,
    displayName: UsersTable.displayName,
    status: UsersTable.status,
};

type BasicUserRecord = {
    id: string;
    email: string;
    emailNormalized: string;
    displayName: string | null;
    status: UserStatus;
};

async function getActiveOrgMembershipWithRole(
    userId: string,
    organizationId: string,
) {
    return db.query.OrganizationMembershipsTable.findFirst({
        columns: { userId: true, organizationId: true, status: true },
        where: and(
            eq(OrganizationMembershipsTable.organizationId, organizationId),
            eq(OrganizationMembershipsTable.userId, userId),
            eq(OrganizationMembershipsTable.status, "active"),
        ),
        with: { role: { columns: { key: true } } },
    });
}

async function isOrgOwner(userId: string, organizationId: string) {
    const membership = await getActiveOrgMembershipWithRole(
        userId,
        organizationId,
    );
    return isOwnerMembership(membership);
}

async function isTeamManager(userId: string, teamId: string) {
    const membership = await db.query.TeamMembershipsTable.findFirst({
        columns: { status: true, isManager: true },
        where: and(
            eq(TeamMembershipsTable.teamId, teamId),
            eq(TeamMembershipsTable.userId, userId),
        ),
    });

    return isActiveTeamManager(membership);
}

async function canManageTeam(
    userId: string,
    teamId: string,
    organizationId: string,
) {
    const [orgMembership, teamMembership] = await Promise.all([
        getActiveOrgMembershipWithRole(userId, organizationId),
        db.query.TeamMembershipsTable.findFirst({
            columns: { status: true, isManager: true },
            where: and(
                eq(TeamMembershipsTable.teamId, teamId),
                eq(TeamMembershipsTable.userId, userId),
            ),
        }),
    ]);

    return canManageTeamMembersFromMemberships({
        organizationMembership: orgMembership,
        teamMembership,
    });
}

function validationError(error: z.ZodError) {
    const flat = error.flatten();
    return {
        success: false as const,
        message: flat.formErrors[0] ?? "Invalid input",
        fieldErrors: flat.fieldErrors as Record<string, string[]>,
    };
}

type DbClient = typeof db;
type TransactionClient = Parameters<Parameters<DbClient["transaction"]>[0]>[0];
type DbExecutor = DbClient | TransactionClient;

async function ensurePermissionCatalog(
    executor: DbExecutor = db,
    { applyTemplate = true }: { applyTemplate?: boolean } = {},
) {
    const definitionsByKey = new Map<string, PermissionDefinition>(
        permissionDefinitions.map((definition) => [definition.key, definition]),
    );

    const existing = await executor.query.PermissionsTable.findMany({
        columns: { id: true, key: true, name: true, description: true },
        where: inArray(
            PermissionsTable.key,
            Array.from(definitionsByKey.keys()) as string[],
        ),
    });

    const existingMap = new Map(existing.map((record) => [record.key, record]));
    const toInsert: Array<{ key: string; name: string; description: string }> = [];

    for (const definition of definitionsByKey.values()) {
        const match = existingMap.get(definition.key);

        if (!match) {
            toInsert.push({
                key: definition.key,
                name: definition.label,
                description: definition.description,
            });
            continue;
        }

        if (
            applyTemplate &&
            (match.name !== definition.label ||
                match.description !== definition.description)
        ) {
            await executor
                .update(PermissionsTable)
                .set({ name: definition.label, description: definition.description })
                .where(eq(PermissionsTable.id, match.id));
        }
    }

    if (toInsert.length > 0) {
        await executor
            .insert(PermissionsTable)
            .values(toInsert)
            .onConflictDoNothing();
    }
}

async function ensureOrganizationAuthorization(
    organizationId: string,
    { applyTemplate = false }: { applyTemplate?: boolean } = {},
) {
    await ensurePermissionCatalog(db, { applyTemplate: true });

    await db.transaction(async (trx) => {
        const roles = await trx.query.RolesTable.findMany({
            columns: {
                id: true,
                key: true,
                name: true,
                description: true,
                scope: true,
                isDefault: true,
            },
            where: eq(RolesTable.organizationId, organizationId),
        });

        const existingByKey = new Map(roles.map((role) => [role.key, role]));

        const templatePermissionKeys = Array.from(
            new Set(defaultRoleTemplates.flatMap((template) => template.permissions)),
        );

        const permissionRows = templatePermissionKeys.length
            ? await trx
                .select({ id: PermissionsTable.id, key: PermissionsTable.key })
                .from(PermissionsTable)
                .where(inArray(PermissionsTable.key, templatePermissionKeys))
            : [];

        const permissionIdByKey = new Map(
            permissionRows.map((row) => [row.key, row.id]),
        );

        const ensureDefault = async (
            roleId: string,
            scope: "organization" | "team",
            shouldBeDefault: boolean,
        ) => {
            if (!shouldBeDefault) return;

            await trx
                .update(RolesTable)
                .set({ isDefault: false })
                .where(
                    and(
                        eq(RolesTable.organizationId, organizationId),
                        eq(RolesTable.scope, scope),
                        ne(RolesTable.id, roleId),
                    ),
                );

            await trx
                .update(RolesTable)
                .set({ isDefault: true })
                .where(eq(RolesTable.id, roleId));
        };

        for (const template of defaultRoleTemplates) {
            const desiredDescription = template.description ?? null;
            const desiredName = template.name;
            const desiredScope = template.scope;
            const templatePermissions = template.permissions ?? [];
            const scopeHasDefault = roles.some(
                (role) => role.scope === desiredScope && role.isDefault,
            );

            const existingRole = existingByKey.get(template.key) ?? null;
            let roleId: string;
            let roleWasCreated = false;

            if (!existingRole) {
                const shouldSetDefault = Boolean(
                    template.isDefault && (applyTemplate || !scopeHasDefault),
                );

                if (shouldSetDefault) {
                    await trx
                        .update(RolesTable)
                        .set({ isDefault: false })
                        .where(
                            and(
                                eq(RolesTable.organizationId, organizationId),
                                eq(RolesTable.scope, desiredScope),
                            ),
                        );
                }

                const [created] = await trx
                    .insert(RolesTable)
                    .values({
                        organizationId,
                        key: template.key,
                        name: desiredName,
                        description: desiredDescription,
                        scope: desiredScope,
                        isDefault: shouldSetDefault,
                    })
                    .returning({
                        id: RolesTable.id,
                        key: RolesTable.key,
                        scope: RolesTable.scope,
                        isDefault: RolesTable.isDefault,
                        name: RolesTable.name,
                        description: RolesTable.description,
                    });

                if (!created) {
                    continue;
                }

                roleId = created.id;
                roleWasCreated = true;
                existingByKey.set(created.key, created);
                roles.push(created);

                if (shouldSetDefault) {
                    for (const role of roles) {
                        if (role.scope === desiredScope) {
                            role.isDefault = role.id === roleId;
                        }
                    }
                }
            } else {
                roleId = existingRole.id;

                if (
                    applyTemplate &&
                    (existingRole.name !== desiredName ||
                        existingRole.description !== desiredDescription ||
                        existingRole.scope !== desiredScope)
                ) {
                    await trx
                        .update(RolesTable)
                        .set({
                            name: desiredName,
                            description: desiredDescription,
                            scope: desiredScope,
                        })
                        .where(eq(RolesTable.id, roleId));
                }

                if (applyTemplate && template.isDefault && !existingRole.isDefault) {
                    await ensureDefault(roleId, desiredScope, true);
                    for (const role of roles) {
                        if (role.scope === desiredScope) {
                            role.isDefault = role.id === roleId;
                        }
                    }
                } else if (
                    applyTemplate &&
                    template.isDefault === false &&
                    existingRole.isDefault
                ) {
                    await trx
                        .update(RolesTable)
                        .set({ isDefault: false })
                        .where(eq(RolesTable.id, roleId));
                    const target = roles.find((role) => role.id === roleId);
                    if (target) {
                        target.isDefault = false;
                    }
                }
            }

            if (
                template.isDefault &&
                (applyTemplate || roleWasCreated) &&
                roles.find((role) => role.id === roleId)?.isDefault !== true
            ) {
                await ensureDefault(roleId, desiredScope, true);
                for (const role of roles) {
                    if (role.scope === desiredScope) {
                        role.isDefault = role.id === roleId;
                    }
                }
            }

            if (templatePermissions.length === 0) {
                continue;
            }

            const permissionIds = templatePermissions
                .map((key) => permissionIdByKey.get(key))
                .filter((id): id is string => Boolean(id));

            if (permissionIds.length === 0) {
                continue;
            }

            if (applyTemplate || roleWasCreated) {
                await trx
                    .delete(RolePermissionsTable)
                    .where(eq(RolePermissionsTable.roleId, roleId));
            }

            const values = permissionIds.map((permissionId) => ({
                roleId,
                permissionId,
            }));

            if (values.length > 0) {
                await trx.insert(RolePermissionsTable).values(values).onConflictDoNothing();
            }
        }
    });
}

async function getDefaultRoleId(
    organizationId: string,
    scope: "organization" | "team",
) {
    const role = await db.query.RolesTable.findFirst({
        columns: { id: true },
        where: and(
            eq(RolesTable.organizationId, organizationId),
            eq(RolesTable.scope, scope),
            eq(RolesTable.isDefault, true),
        ),
    });

    return role?.id ?? null;
}

function buildPermissionCatalog(): PermissionCatalogGroup[] {
    const groups = new Map<string, PermissionCatalogGroup>();

    for (const definition of permissionDefinitions) {
        const existing = groups.get(definition.category) ?? {
            category: definition.category,
            items: [],
        };

        existing.items.push({
            key: definition.key,
            label: definition.label,
            description: definition.description,
        });

        groups.set(definition.category, existing);
    }

    return Array.from(groups.values())
        .map((group) => ({
            category: group.category,
            items: group.items.sort((a, b) => a.label.localeCompare(b.label)),
        }))
        .sort((a, b) => a.category.localeCompare(b.category));
}

async function generateUniqueOrgSlug(name: string) {
    const base = slugify(name);
    let candidate = base;
    let suffix = 1;

    while (true) {
        const existing = await db.query.OrganizationsTable.findFirst({
            columns: { id: true },
            where: eq(OrganizationsTable.slug, candidate),
        });

        if (!existing) return candidate;
        candidate = `${base}-${suffix}`;
        suffix += 1;
    }
}

async function generateUniqueTeamSlug(organizationId: string, name: string) {
    const base = slugify(name);
    let candidate = base;
    let suffix = 1;

    while (true) {
        const existing = await db.query.TeamsTable.findFirst({
            columns: { id: true },
            where: and(
                eq(TeamsTable.organizationId, organizationId),
                eq(TeamsTable.slug, candidate),
            ),
        });

        if (!existing) return candidate;
        candidate = `${base}-${suffix}`;
        suffix += 1;
    }
}

export async function createOrganization(input: CreateOrganizationInput) {
    const parsed = createOrganizationSchema.safeParse(input);
    if (!parsed.success) {
        return validationError(parsed.error);
    }

    const currentUser = await getCurrentUser({ redirectIfNotFound: true });
    const slug = await generateUniqueOrgSlug(parsed.data.name);
    const now = new Date();
    let newOrganizationId: string | null = null;

    try {
        await db.transaction(async (trx) => {
            const [organization] = await trx
                .insert(OrganizationsTable)
                .values({
                    name: parsed.data.name,
                    slug,
                    description: parsed.data.description,
                    createdById: currentUser.id,
                })
                .returning({ id: OrganizationsTable.id });

            if (!organization) {
                throw new Error("Failed to create organization");
            }

            newOrganizationId = organization.id;

            let ownerRole = await trx.query.RolesTable.findFirst({
                columns: { id: true },
                where: and(
                    eq(RolesTable.organizationId, organization.id),
                    eq(RolesTable.key, OWNER_ROLE_KEY),
                ),
            });

            if (!ownerRole) {
                const [role] = await trx
                    .insert(RolesTable)
                    .values({
                        key: OWNER_ROLE_KEY,
                        name: "Owner",
                        description: "Full control over the organization",
                        scope: "organization",
                        organizationId: organization.id,
                        isDefault: false,
                    })
                    .returning({ id: RolesTable.id });

                if (!role) {
                    throw new Error("Failed to create owner role");
                }

                ownerRole = role;
            }

            if (!ownerRole) {
                throw new Error("Failed to ensure owner role");
            }

            await trx
                .insert(OrganizationMembershipsTable)
                .values({
                    organizationId: organization.id,
                    userId: currentUser.id,
                    roleId: ownerRole.id,
                    status: "active",
                    isDefault: true,
                    joinedAt: now,
                });

            await trx
                .update(OrganizationMembershipsTable)
                .set({ isDefault: false })
                .where(
                    and(
                        eq(OrganizationMembershipsTable.userId, currentUser.id),
                        ne(OrganizationMembershipsTable.organizationId, organization.id),
                    ),
                );

            await trx
                .update(OrganizationMembershipsTable)
                .set({ isDefault: true })
                .where(
                    and(
                        eq(OrganizationMembershipsTable.userId, currentUser.id),
                        eq(OrganizationMembershipsTable.organizationId, organization.id),
                    ),
                );
        });
    } catch (error) {
        console.error(error);
        return { success: false as const, message: "Unable to create organization" };
    }

    if (newOrganizationId) {
        try {
            await ensureOrganizationAuthorization(newOrganizationId, {
                applyTemplate: true,
            });
        } catch (error) {
            console.error("Failed to provision authorization defaults", error);
        }
    }

    revalidatePath("/");

    return { success: true as const, message: "Organization created" };
}

export async function deleteOrganization(organizationId: string) {
    const currentUser = await getCurrentUser({ redirectIfNotFound: true });

    if (!(await isOrgOwner(currentUser.id, organizationId))) {
        return {
            success: false as const,
            message: "Only organization owners can delete the organization",
        };
    }

    await db.transaction(async (trx) => {
        await trx
            .delete(OrganizationsTable)
            .where(eq(OrganizationsTable.id, organizationId));

        const nextMembership = await trx.query.OrganizationMembershipsTable.findFirst(
            {
                columns: { organizationId: true },
                where: and(
                    eq(OrganizationMembershipsTable.userId, currentUser.id),
                    ne(OrganizationMembershipsTable.organizationId, organizationId),
                ),
                orderBy: (table, { desc }) => desc(table.createdAt),
            },
        );

        if (nextMembership) {
            await trx
                .update(OrganizationMembershipsTable)
                .set({ isDefault: true })
                .where(
                    eq(
                        OrganizationMembershipsTable.organizationId,
                        nextMembership.organizationId,
                    ),
                );
        }
    });

    revalidatePath("/");

    return { success: true as const, message: "Organization deleted" };
}

export async function setActiveOrganization(organizationId: string) {
    const parsed = setActiveOrganizationSchema.safeParse({ organizationId });
    if (!parsed.success) {
        return validationError(parsed.error);
    }

    const currentUser = await getCurrentUser({ redirectIfNotFound: true });

    const membership = await db.query.OrganizationMembershipsTable.findFirst({
        columns: { organizationId: true },
        where: and(
            eq(OrganizationMembershipsTable.organizationId, parsed.data.organizationId),
            eq(OrganizationMembershipsTable.userId, currentUser.id),
        ),
    });

    if (!membership) {
        return {
            success: false as const,
            message: "You do not belong to that organization",
        };
    }

    await db.transaction(async (trx) => {
        await trx
            .update(OrganizationMembershipsTable)
            .set({ isDefault: false })
            .where(eq(OrganizationMembershipsTable.userId, currentUser.id));

        await trx
            .update(OrganizationMembershipsTable)
            .set({ isDefault: true })
            .where(
                and(
                    eq(OrganizationMembershipsTable.userId, currentUser.id),
                    eq(
                        OrganizationMembershipsTable.organizationId,
                        parsed.data.organizationId,
                    ),
                ),
            );
    });

    revalidatePath("/");

    return { success: true as const, message: "Organization selected" };
}

export async function getUserOrganizations() {
    const currentUser = await getCurrentUser({ redirectIfNotFound: true });

    const memberships = await db.query.OrganizationMembershipsTable.findMany({
        columns: { organizationId: true, isDefault: true, status: true },
        where: eq(OrganizationMembershipsTable.userId, currentUser.id),
        with: {
            organization: {
                columns: { id: true, name: true, slug: true, description: true },
            },
        },
        orderBy: (table, { desc }) => desc(table.createdAt),
    });

    return memberships
        .filter((membership) => membership.organization)
        .map((membership) => ({
            id: membership.organization!.id,
            name: membership.organization!.name,
            slug: membership.organization!.slug,
            description: membership.organization!.description ?? null,
            status: membership.status,
            isDefault: membership.isDefault,
        }));
}

export async function getActiveOrganization() {
    const organizations = await getUserOrganizations();
    return organizations.find((org) => org.isDefault) ?? organizations[0] ?? null;
}

export async function createTeam(input: CreateTeamInput) {
    const parsed = createTeamSchema.safeParse(input);
    if (!parsed.success) {
        return validationError(parsed.error);
    }

    const currentUser = await getCurrentUser({ redirectIfNotFound: true });

    const membership = await getActiveOrgMembershipWithRole(
        currentUser.id,
        parsed.data.organizationId,
    );

    if (!membership) {
        return {
            success: false as const,
            message: "You do not have access to that organization",
        };
    }

    if (!canCreateTeamFromMembership(membership)) {
        return {
            success: false as const,
            message: "Only organization owners can create teams",
        };
    }

    const slug = await generateUniqueTeamSlug(
        parsed.data.organizationId,
        parsed.data.name,
    );

    try {
        await db
            .insert(TeamsTable)
            .values({
                organizationId: parsed.data.organizationId,
                name: parsed.data.name,
                slug,
                description: parsed.data.description,
                parentTeamId: parsed.data.parentTeamId || null,
            });
    } catch (error) {
        console.error(error);
        return { success: false as const, message: "Unable to create team" };
    }

    revalidatePath("/");

    return { success: true as const, message: "Team created" };
}

type SearchTeamInviteesSuccess = {
    success: true;
    data: Array<{
        id: string;
        label: string;
        value: string;
        description?: string;
        isDisabled?: boolean;
    }>;
};

type SearchTeamInviteesFailure = { success: false; error: string };

export async function searchTeamInvitees(
    input: SearchTeamInviteesInput,
): Promise<SearchTeamInviteesSuccess | SearchTeamInviteesFailure> {
    const parsed = searchTeamInviteesSchema.safeParse(input);
    if (!parsed.success) {
        const message = parsed.error.issues[0]?.message ?? "Invalid search input";
        return { success: false, error: message };
    }

    const currentUser = await getCurrentUser({ redirectIfNotFound: true });

    const team = await db.query.TeamsTable.findFirst({
        columns: { id: true, organizationId: true },
        where: eq(TeamsTable.id, parsed.data.teamId),
    });

    if (!team) {
        return { success: false, error: "Team not found" };
    }

    const canManage = await canManageTeam(
        currentUser.id,
        parsed.data.teamId,
        team.organizationId,
    );

    if (!canManage) {
        return {
            success: false,
            error: "You need to be an organization owner or team manager",
        };
    }

    const tokens = Array.from(
        new Set(parsed.data.query.trim().toLowerCase().split(/\s+/).filter(Boolean)),
    );

    if (tokens.length === 0) {
        return { success: true, data: [] };
    }

    const tokenConditions = tokens.map((token) =>
        or(
            ilike(UsersTable.emailNormalized, `%${token}%`),
            ilike(UsersTable.name, `%${token}%`),
        ),
    );

    const rows = await db
        .select({
            id: UsersTable.id,
            email: UsersTable.email,
            displayName: UsersTable.displayName,
            status: UsersTable.status,
            teamMembershipStatus: TeamMembershipsTable.status,
        })
        .from(UsersTable)
        .leftJoin(
            TeamMembershipsTable,
            and(
                eq(TeamMembershipsTable.teamId, parsed.data.teamId),
                eq(TeamMembershipsTable.userId, UsersTable.id),
            ),
        )
        .where(
            and(
                inArray(UsersTable.status, ["active", "invited"]),
                or(
                    isNull(TeamMembershipsTable.userId),
                    ne(TeamMembershipsTable.status, "active"),
                ),
                ...tokenConditions,
            ),
        )
        .orderBy(UsersTable.displayName, UsersTable.email)
        .limit(20);

    const data = rows.map((row) => {
        const label = row.displayName ?? row.email;
        const description = row.displayName ? row.email : undefined;

        return {
            id: row.id,
            label,
            value: row.email,
            description,
            isDisabled: row.teamMembershipStatus === "active",
        };
    });

    return { success: true, data };
}

export async function addTeamMember(input: AddTeamMemberInput) {
    const parsed = addTeamMemberSchema.safeParse(input);
    if (!parsed.success) {
        return validationError(parsed.error);
    }

    const currentUser = await getCurrentUser({ redirectIfNotFound: true });
    const team = await db.query.TeamsTable.findFirst({
        columns: { id: true, organizationId: true },
        where: eq(TeamsTable.id, parsed.data.teamId),
    });

    if (!team) {
        return { success: false as const, message: "Team not found" };
    }

    await ensureOrganizationAuthorization(team.organizationId);

    let selectedTeamRoleId: string | null = parsed.data.roleId ?? null;
    if (selectedTeamRoleId) {
        const roleRecord = await db.query.RolesTable.findFirst({
            columns: { id: true, organizationId: true, scope: true },
            where: eq(RolesTable.id, selectedTeamRoleId),
        });

        if (
            !roleRecord ||
            roleRecord.organizationId !== team.organizationId ||
            roleRecord.scope !== "team"
        ) {
            return {
                success: false as const,
                message: "Selected role is not valid for this team",
            };
        }
    } else {
        selectedTeamRoleId = await getDefaultRoleId(team.organizationId, "team");
    }

    const defaultOrganizationRoleId = await getDefaultRoleId(
        team.organizationId,
        "organization",
    );

    const membership = await getActiveOrgMembershipWithRole(
        currentUser.id,
        team.organizationId,
    );

    if (!membership) {
        return {
            success: false as const,
            message: "You do not have access to that organization",
        };
    }

    if (
        !(await canManageTeam(
            currentUser.id,
            parsed.data.teamId,
            team.organizationId,
        ))
    ) {
        return {
            success: false as const,
            message: "You need to be an organization owner or team manager",
        };
    }

    const email = parsed.data.email.trim();
    const normalizedEmail = email.toLowerCase();

    let user: BasicUserRecord | null = null;
    let createdNewUser = false;

    if (input.isNew) {
        try {
            const result = await db.transaction(
                async (trx): Promise<{ user: BasicUserRecord; created: boolean }> => {
                    const existing = await trx.query.UsersTable.findFirst({
                        columns: userSelectionColumns,
                        where: eq(UsersTable.emailNormalized, normalizedEmail),
                    });

                    if (existing) {
                        return { user: existing, created: false };
                    }

                    const [created] = await trx
                        .insert(UsersTable)
                        .values({
                            email,
                            emailNormalized: normalizedEmail,
                            displayName: email,
                            name: email,
                            status: "invited",
                        })
                        .returning(userReturningColumns);

                    if (!created) {
                        throw new Error("Failed to create user");
                    }

                    return { user: created, created: true };
                },
            );

            user = result.user;
            createdNewUser = result.created;
        } catch (error) {
            console.error("Failed to create invited user", error);
            return {
                success: false as const,
                message: "Unable to create a new user for that email",
            };
        }
    } else {
        user =
            (await db.query.UsersTable.findFirst({
                columns: userSelectionColumns,
                where: eq(UsersTable.emailNormalized, normalizedEmail),
            })) ?? null;
    }

    if (!user) {
        return {
            success: false as const,
            message: "No account found for that email",
        };
    }

    await db.transaction(async (trx) => {
        const orgMembership = await trx.query.OrganizationMembershipsTable.findFirst({
            columns: { organizationId: true, status: true, roleId: true },
            where: and(
                eq(OrganizationMembershipsTable.organizationId, team.organizationId),
                eq(OrganizationMembershipsTable.userId, user.id),
            ),
        });

        if (!orgMembership) {
            await trx
                .insert(OrganizationMembershipsTable)
                .values({
                    organizationId: team.organizationId,
                    userId: user.id,
                    status: "active",
                    joinedAt: new Date(),
                    isDefault: false,
                    roleId: defaultOrganizationRoleId,
                });
        } else if (
            orgMembership.status !== "active" ||
            (!orgMembership.roleId && defaultOrganizationRoleId)
        ) {
            await trx
                .update(OrganizationMembershipsTable)
                .set({
                    status: "active",
                    updatedAt: new Date(),
                    ...(orgMembership.roleId
                        ? {}
                        : defaultOrganizationRoleId
                            ? { roleId: defaultOrganizationRoleId }
                            : {}),
                })
                .where(
                    and(
                        eq(OrganizationMembershipsTable.organizationId, team.organizationId),
                        eq(OrganizationMembershipsTable.userId, user.id),
                    ),
                );
        }

        await trx
            .insert(TeamMembershipsTable)
            .values({
                teamId: parsed.data.teamId,
                userId: user.id,
                status: "active",
                joinedAt: new Date(),
                roleId: selectedTeamRoleId ?? undefined,
            })
            .onConflictDoUpdate({
                target: [TeamMembershipsTable.teamId, TeamMembershipsTable.userId],
                set: {
                    status: "active",
                    joinedAt: new Date(),
                    ...(selectedTeamRoleId ? { roleId: selectedTeamRoleId } : {}),
                },
            });
    });

    let onboardingResult: OnboardingOutcome | null = null;

    if (createdNewUser) {
        try {
            onboardingResult = await onboardNewUser({ user, email, normalizedEmail });
        } catch (error) {
            console.error("Failed to onboard new team member", error);
        }
    }

    revalidatePath("/");

    let successMessage = "Member added to team";

    if (createdNewUser) {
        if (onboardingResult?.kind === "verification") {
            successMessage = `Member invited. Verification email sent to ${email}.`;
        } else if (onboardingResult?.kind === "password") {
            successMessage = `Member added. Share this temporary password with them: ${onboardingResult.password}`;
        }
    } else if (input.isNew) {
        successMessage = "Existing account found and added to the team";
    }

    return { success: true as const, message: successMessage };
}

export async function removeTeamMember(teamId: string, userId: string) {
    const currentUser = await getCurrentUser({ redirectIfNotFound: true });

    const team = await db.query.TeamsTable.findFirst({
        columns: { id: true, organizationId: true },
        where: eq(TeamsTable.id, teamId),
    });

    if (!team) {
        return { success: false as const, message: "Team not found" };
    }

    const membership = await getActiveOrgMembershipWithRole(
        currentUser.id,
        team.organizationId,
    );

    if (!membership) {
        return {
            success: false as const,
            message: "You do not have access to that organization",
        };
    }

    if (!(await canManageTeam(currentUser.id, teamId, team.organizationId))) {
        return {
            success: false as const,
            message: "You need to be an organization owner or team manager",
        };
    }

    await db
        .delete(TeamMembershipsTable)
        .where(
            and(
                eq(TeamMembershipsTable.teamId, teamId),
                eq(TeamMembershipsTable.userId, userId),
            ),
        );

    revalidatePath("/");

    return { success: true as const, message: "Member removed" };
}

export async function setTeamMemberManager(input: SetTeamMemberManagerInput) {
    const parsed = setTeamMemberManagerSchema.safeParse(input);
    if (!parsed.success) {
        return validationError(parsed.error);
    }

    const currentUser = await getCurrentUser({ redirectIfNotFound: true });

    const team = await db.query.TeamsTable.findFirst({
        columns: { id: true, organizationId: true },
        where: eq(TeamsTable.id, parsed.data.teamId),
    });

    if (!team) {
        return { success: false as const, message: "Team not found" };
    }

    const membership = await db.query.OrganizationMembershipsTable.findFirst({
        columns: { organizationId: true },
        where: and(
            eq(OrganizationMembershipsTable.organizationId, team.organizationId),
            eq(OrganizationMembershipsTable.userId, currentUser.id),
            eq(OrganizationMembershipsTable.status, "active"),
        ),
    });

    if (!membership) {
        return {
            success: false as const,
            message: "You do not have access to that organization",
        };
    }

    if (
        !(await canManageTeam(
            currentUser.id,
            parsed.data.teamId,
            team.organizationId,
        ))
    ) {
        return {
            success: false as const,
            message: "You need to be an organization owner or team manager",
        };
    }

    const teamMembership = await db.query.TeamMembershipsTable.findFirst({
        columns: { status: true },
        where: and(
            eq(TeamMembershipsTable.teamId, parsed.data.teamId),
            eq(TeamMembershipsTable.userId, parsed.data.userId),
        ),
    });

    if (!teamMembership) {
        return { success: false as const, message: "Member not found on that team" };
    }

    if (teamMembership.status !== "active") {
        return {
            success: false as const,
            message: "Only active members can be updated",
        };
    }

    await db
        .update(TeamMembershipsTable)
        .set({ isManager: parsed.data.isManager })
        .where(
            and(
                eq(TeamMembershipsTable.teamId, parsed.data.teamId),
                eq(TeamMembershipsTable.userId, parsed.data.userId),
            ),
        );

    revalidatePath("/");

    return {
        success: true as const,
        message: parsed.data.isManager
            ? "Member promoted to manager"
            : "Manager role removed",
    };
}

export async function setTeamMemberRole(input: SetTeamMemberRoleInput) {
    const parsed = setTeamMemberRoleSchema.safeParse(input);
    if (!parsed.success) {
        return validationError(parsed.error);
    }

    const currentUser = await getCurrentUser({ redirectIfNotFound: true });

    const team = await db.query.TeamsTable.findFirst({
        columns: { id: true, organizationId: true },
        where: eq(TeamsTable.id, parsed.data.teamId),
    });

    if (!team) {
        return { success: false as const, message: "Team not found" };
    }

    const membership = await getActiveOrgMembershipWithRole(
        currentUser.id,
        team.organizationId,
    );

    if (!membership) {
        return {
            success: false as const,
            message: "You do not have access to that organization",
        };
    }

    if (
        !(await canManageTeam(
            currentUser.id,
            parsed.data.teamId,
            team.organizationId,
        ))
    ) {
        return {
            success: false as const,
            message: "You need to be an organization owner or team manager",
        };
    }

    let targetRoleId: string | null = parsed.data.roleId ?? null;

    if (targetRoleId) {
        const targetRole = await db.query.RolesTable.findFirst({
            columns: { id: true, organizationId: true, scope: true },
            where: eq(RolesTable.id, targetRoleId),
        });

        if (
            !targetRole ||
            targetRole.organizationId !== team.organizationId ||
            targetRole.scope !== "team"
        ) {
            return {
                success: false as const,
                message: "Selected role is not valid for this team",
            };
        }
    }

    const teamMembership = await db.query.TeamMembershipsTable.findFirst({
        columns: { status: true },
        where: and(
            eq(TeamMembershipsTable.teamId, parsed.data.teamId),
            eq(TeamMembershipsTable.userId, parsed.data.userId),
        ),
    });

    if (!teamMembership) {
        return { success: false as const, message: "Member not found on that team" };
    }

    if (teamMembership.status !== "active") {
        return {
            success: false as const,
            message: "Only active members can be updated",
        };
    }

    await db
        .update(TeamMembershipsTable)
        .set({ roleId: targetRoleId ?? null })
        .where(
            and(
                eq(TeamMembershipsTable.teamId, parsed.data.teamId),
                eq(TeamMembershipsTable.userId, parsed.data.userId),
            ),
        );

    revalidatePath("/");

    return {
        success: true as const,
        message: targetRoleId ? "Member role updated" : "Member role cleared",
    };
}

export async function getOrganizationTeams(organizationId: string) {
    const currentUser = await getCurrentUser({ redirectIfNotFound: true });

    const orgMembership = await getActiveOrgMembershipWithRole(
        currentUser.id,
        organizationId,
    );

    if (!orgMembership) {
        return {
            isOwner: false,
            canManage: false,
            teams: [] as OrganizationTeamSummary[],
        };
    }

    const isOwner = isOwnerMembership(orgMembership);

    const teams = await db.query.TeamsTable.findMany({
        columns: { id: true, name: true, description: true },
        where: eq(TeamsTable.organizationId, organizationId),
        orderBy: (table, { asc }) => asc(table.name),
    });

    if (teams.length === 0) {
        return {
            isOwner,
            canManage: isOwner,
            teams: [] as OrganizationTeamSummary[],
        };
    }

    const teamIds = teams.map((team) => team.id);
    const memberships = await db.query.TeamMembershipsTable.findMany({
        columns: { teamId: true },
        where: inArray(TeamMembershipsTable.teamId, teamIds),
    });

    const myMemberships = await db.query.TeamMembershipsTable.findMany({
        columns: { teamId: true, status: true, isManager: true },
        where: and(
            eq(TeamMembershipsTable.userId, currentUser.id),
            inArray(TeamMembershipsTable.teamId, teamIds),
        ),
    });

    const counts = new Map<string, number>();
    for (const member of memberships) {
        counts.set(member.teamId, (counts.get(member.teamId) ?? 0) + 1);
    }

    const myMembershipMap = new Map<
        string,
        { status: string; isManager: boolean | null }
    >();
    for (const entry of myMemberships) {
        myMembershipMap.set(entry.teamId, {
            status: entry.status,
            isManager: entry.isManager,
        });
    }

    const teamSummaries = teams.map<OrganizationTeamSummary>((team) => {
        const myMembership = myMembershipMap.get(team.id);
        const isManager = isActiveTeamManager(myMembership);

        return {
            id: team.id,
            name: team.name,
            description: team.description,
            memberCount: counts.get(team.id) ?? 0,
            isManager,
            canManageMembers: isOwner || isManager,
        };
    });

    const canManage =
        isOwner || teamSummaries.some((team) => team.canManageMembers);

    return { isOwner, canManage, teams: teamSummaries };
}

export async function getTeamMembers(teamId: string) {
    const currentUser = await getCurrentUser({ redirectIfNotFound: true });

    const team = await db.query.TeamsTable.findFirst({
        columns: { id: true, organizationId: true },
        where: eq(TeamsTable.id, teamId),
    });

    if (!team) {
        return [];
    }

    const membership = await db.query.OrganizationMembershipsTable.findFirst({
        columns: { organizationId: true },
        where: and(
            eq(OrganizationMembershipsTable.organizationId, team.organizationId),
            eq(OrganizationMembershipsTable.userId, currentUser.id),
            eq(OrganizationMembershipsTable.status, "active"),
        ),
    });

    if (!membership) {
        return [];
    }

    const members = await db.query.TeamMembershipsTable.findMany({
        columns: {
            teamId: true,
            userId: true,
            status: true,
            isManager: true,
            roleId: true,
        },
        where: eq(TeamMembershipsTable.teamId, teamId),
        with: {
            user: { columns: { id: true, displayName: true, email: true } },
            role: { columns: { id: true, name: true } },
        },
        orderBy: (table, { desc }) => desc(table.createdAt),
    });

    return members
        .filter((member) => member.user)
        .map((member) => ({
            id: member.user!.id,
            email: member.user!.email,
            name: member.user!.displayName ?? member.user!.email,
            status: member.status,
            isManager: member.isManager,
            roleId: member.roleId,
            roleName: member.role?.name ?? null,
        }));
}

export async function getOrganizationAuthorization(organizationId: string) {
    const currentUser = await getCurrentUser({ redirectIfNotFound: true });

    const membership = await getActiveOrgMembershipWithRole(
        currentUser.id,
        organizationId,
    );

    if (!membership) {
        return {
            canEdit: false,
            roles: [] as AuthorizationRoleSummary[],
            permissionCatalog: buildPermissionCatalog(),
            isOwner: false,
        };
    }

    const isOwner = isOwnerMembership(membership);

    await ensureOrganizationAuthorization(organizationId);

    const roles = await db.query.RolesTable.findMany({
        columns: {
            id: true,
            key: true,
            name: true,
            description: true,
            scope: true,
            isDefault: true,
        },
        where: and(
            eq(RolesTable.organizationId, organizationId),
            inArray(RolesTable.scope, ["organization", "team"] as const),
        ),
        orderBy: (table, { asc }) => asc(table.name),
    });

    if (roles.length === 0) {
        return {
            canEdit: isOwner,
            roles: [] as AuthorizationRoleSummary[],
            permissionCatalog: buildPermissionCatalog(),
            isOwner,
        };
    }

    const roleIds = roles.map((role) => role.id);

    const rolePermissionRows = await db
        .select({
            roleId: RolePermissionsTable.roleId,
            permissionKey: PermissionsTable.key,
        })
        .from(RolePermissionsTable)
        .innerJoin(
            PermissionsTable,
            eq(RolePermissionsTable.permissionId, PermissionsTable.id),
        )
        .where(inArray(RolePermissionsTable.roleId, roleIds));

    const rolePermissionsMap = new Map<string, Set<PermissionKey>>();
    for (const row of rolePermissionRows) {
        if (!row.permissionKey) continue;
        const permissionKey = row.permissionKey as PermissionKey;
        const existing =
            rolePermissionsMap.get(row.roleId) ?? new Set<PermissionKey>();
        existing.add(permissionKey);
        rolePermissionsMap.set(row.roleId, existing);
    }

    const assignmentCounts = new Map<string, number>();

    const organizationScopedRoleIds = roles
        .filter((role) => role.scope === "organization")
        .map((role) => role.id);

    if (organizationScopedRoleIds.length > 0) {
        const orgAssignments = await db.query.OrganizationMembershipsTable.findMany({
            columns: { roleId: true },
            where: and(
                eq(OrganizationMembershipsTable.organizationId, organizationId),
                inArray(OrganizationMembershipsTable.roleId, organizationScopedRoleIds),
                isNotNull(OrganizationMembershipsTable.roleId),
            ),
        });

        for (const assignment of orgAssignments) {
            if (!assignment.roleId) continue;
            assignmentCounts.set(
                assignment.roleId,
                (assignmentCounts.get(assignment.roleId) ?? 0) + 1,
            );
        }
    }

    const teamScopedRoleIds = roles
        .filter((role) => role.scope === "team")
        .map((role) => role.id);

    if (teamScopedRoleIds.length > 0) {
        const teamAssignments = await db
            .select({ roleId: TeamMembershipsTable.roleId })
            .from(TeamMembershipsTable)
            .innerJoin(TeamsTable, eq(TeamMembershipsTable.teamId, TeamsTable.id))
            .where(
                and(
                    eq(TeamsTable.organizationId, organizationId),
                    inArray(TeamMembershipsTable.roleId, teamScopedRoleIds),
                    isNotNull(TeamMembershipsTable.roleId),
                ),
            );

        for (const assignment of teamAssignments) {
            const roleId = assignment.roleId;
            if (!roleId) continue;
            assignmentCounts.set(roleId, (assignmentCounts.get(roleId) ?? 0) + 1);
        }
    }

    const roleSummaries = roles
        .map<AuthorizationRoleSummary>((role) => {
            const permissions = Array.from(
                rolePermissionsMap.get(role.id) ?? new Set<PermissionKey>(),
            ).sort();
            const scope = role.scope as "organization" | "team";

            return {
                id: role.id,
                key: role.key,
                name: role.name,
                description: role.description,
                scope,
                isDefault: role.isDefault,
                permissions,
                assignmentCount: assignmentCounts.get(role.id) ?? 0,
                locked: role.key === OWNER_ROLE_KEY,
            };
        })
        .sort((a, b) => {
            if (a.scope === b.scope) {
                return a.name.localeCompare(b.name);
            }
            return a.scope === "organization" ? -1 : 1;
        });

    return {
        canEdit: isOwner,
        roles: roleSummaries,
        permissionCatalog: buildPermissionCatalog(),
        isOwner,
    };
}

export async function createRole(input: CreateRoleInput) {
    const parsed = createRoleSchema.safeParse(input);
    if (!parsed.success) {
        return validationError(parsed.error);
    }

    const currentUser = await getCurrentUser({ redirectIfNotFound: true });

    const membership = await getActiveOrgMembershipWithRole(
        currentUser.id,
        parsed.data.organizationId,
    );

    if (!isOwnerMembership(membership)) {
        return {
            success: false as const,
            message: "Only organization owners can manage roles",
        };
    }

    await ensureOrganizationAuthorization(parsed.data.organizationId);

    const baseKey = slugify(parsed.data.name);
    let candidateKey = baseKey.length > 0 ? baseKey : "role";
    let suffix = 1;

    while (true) {
        const existing = await db.query.RolesTable.findFirst({
            columns: { id: true },
            where: and(
                eq(RolesTable.organizationId, parsed.data.organizationId),
                eq(RolesTable.key, candidateKey),
            ),
        });

        if (!existing) break;
        candidateKey = `${baseKey || "role"}-${suffix}`;
        suffix += 1;
    }

    const shouldSetDefault = Boolean(parsed.data.isDefault);
    const [created] = await db
        .insert(RolesTable)
        .values({
            organizationId: parsed.data.organizationId,
            key: candidateKey,
            name: parsed.data.name.trim(),
            description: parsed.data.description ?? null,
            scope: parsed.data.scope,
            isDefault: shouldSetDefault,
        })
        .returning({ id: RolesTable.id, scope: RolesTable.scope });

    if (!created) {
        return { success: false as const, message: "Unable to create role" };
    }

    if (shouldSetDefault) {
        await db
            .update(RolesTable)
            .set({ isDefault: false })
            .where(
                and(
                    eq(RolesTable.organizationId, parsed.data.organizationId),
                    eq(RolesTable.scope, parsed.data.scope),
                    ne(RolesTable.id, created.id),
                ),
            );
    }

    await ensureOrganizationAuthorization(parsed.data.organizationId);
    revalidatePath("/");

    return { success: true as const, message: "Role created" };
}

export async function updateRole(input: UpdateRoleInput) {
    const parsed = updateRoleSchema.safeParse(input);
    if (!parsed.success) {
        return validationError(parsed.error);
    }

    const currentUser = await getCurrentUser({ redirectIfNotFound: true });

    const membership = await getActiveOrgMembershipWithRole(
        currentUser.id,
        parsed.data.organizationId,
    );

    if (!isOwnerMembership(membership)) {
        return {
            success: false as const,
            message: "Only organization owners can manage roles",
        };
    }

    const role = await db.query.RolesTable.findFirst({
        columns: { id: true, organizationId: true, key: true },
        where: eq(RolesTable.id, parsed.data.roleId),
    });

    if (!role || role.organizationId !== parsed.data.organizationId) {
        return { success: false as const, message: "Role not found" };
    }

    await db
        .update(RolesTable)
        .set({
            name: parsed.data.name.trim(),
            description: parsed.data.description ?? null,
        })
        .where(eq(RolesTable.id, role.id));

    revalidatePath("/");

    return { success: true as const, message: "Role updated" };
}

export async function deleteRole(input: DeleteRoleInput) {
    const parsed = deleteRoleSchema.safeParse(input);
    if (!parsed.success) {
        return validationError(parsed.error);
    }

    const currentUser = await getCurrentUser({ redirectIfNotFound: true });

    const membership = await getActiveOrgMembershipWithRole(
        currentUser.id,
        parsed.data.organizationId,
    );

    if (!isOwnerMembership(membership)) {
        return {
            success: false as const,
            message: "Only organization owners can manage roles",
        };
    }

    const role = await db.query.RolesTable.findFirst({
        columns: {
            id: true,
            key: true,
            scope: true,
            isDefault: true,
            organizationId: true,
        },
        where: eq(RolesTable.id, parsed.data.roleId),
    });

    if (!role || role.organizationId !== parsed.data.organizationId) {
        return { success: false as const, message: "Role not found" };
    }

    if (role.key === OWNER_ROLE_KEY) {
        return {
            success: false as const,
            message: "The owner role cannot be deleted",
        };
    }

    if (role.isDefault) {
        return {
            success: false as const,
            message: "Unset the default role before deleting it",
        };
    }

    if (role.scope === "organization") {
        const assignments = await db.query.OrganizationMembershipsTable.findFirst({
            columns: { roleId: true },
            where: and(
                eq(OrganizationMembershipsTable.organizationId, parsed.data.organizationId),
                eq(OrganizationMembershipsTable.roleId, role.id),
            ),
        });

        if (assignments) {
            return {
                success: false as const,
                message: "Remove or reassign members before deleting this role",
            };
        }
    } else {
        const assignments = await db.query.TeamMembershipsTable.findFirst({
            columns: { roleId: true },
            where: eq(TeamMembershipsTable.roleId, role.id),
        });

        if (assignments) {
            return {
                success: false as const,
                message: "Remove or reassign members before deleting this role",
            };
        }
    }

    await db.delete(RolesTable).where(eq(RolesTable.id, role.id));
    revalidatePath("/");

    return { success: true as const, message: "Role deleted" };
}

export async function setRolePermissions(input: SetRolePermissionsInput) {
    const parsed = setRolePermissionsSchema.safeParse(input);
    if (!parsed.success) {
        return validationError(parsed.error);
    }

    const currentUser = await getCurrentUser({ redirectIfNotFound: true });

    const membership = await getActiveOrgMembershipWithRole(
        currentUser.id,
        parsed.data.organizationId,
    );

    if (!isOwnerMembership(membership)) {
        return {
            success: false as const,
            message: "Only organization owners can manage roles",
        };
    }

    const role = await db.query.RolesTable.findFirst({
        columns: { id: true, organizationId: true },
        where: eq(RolesTable.id, parsed.data.roleId),
    });

    if (!role || role.organizationId !== parsed.data.organizationId) {
        return { success: false as const, message: "Role not found" };
    }

    const permissionRows = parsed.data.permissionKeys.length
        ? await db
            .select({ id: PermissionsTable.id, key: PermissionsTable.key })
            .from(PermissionsTable)
            .where(inArray(PermissionsTable.key, parsed.data.permissionKeys))
        : [];

    const permissionIdByKey = new Map(
        permissionRows.map((row) => [row.key, row.id]),
    );
    const values = parsed.data.permissionKeys
        .map((key) => permissionIdByKey.get(key))
        .filter((id): id is string => Boolean(id))
        .map((permissionId) => ({ roleId: role.id, permissionId }));

    await db.transaction(async (trx) => {
        await trx
            .delete(RolePermissionsTable)
            .where(eq(RolePermissionsTable.roleId, role.id));

        if (values.length > 0) {
            await trx.insert(RolePermissionsTable).values(values);
        }
    });

    revalidatePath("/");

    return { success: true as const, message: "Role permissions updated" };
}

export async function setRoleDefault(input: SetRoleDefaultInput) {
    const parsed = setRoleDefaultSchema.safeParse(input);
    if (!parsed.success) {
        return validationError(parsed.error);
    }

    const currentUser = await getCurrentUser({ redirectIfNotFound: true });

    const membership = await getActiveOrgMembershipWithRole(
        currentUser.id,
        parsed.data.organizationId,
    );

    if (!isOwnerMembership(membership)) {
        return {
            success: false as const,
            message: "Only organization owners can manage roles",
        };
    }

    const role = await db.query.RolesTable.findFirst({
        columns: { id: true, organizationId: true, scope: true },
        where: eq(RolesTable.id, parsed.data.roleId),
    });

    if (!role || role.organizationId !== parsed.data.organizationId) {
        return { success: false as const, message: "Role not found" };
    }

    await db
        .update(RolesTable)
        .set({ isDefault: false })
        .where(
            and(
                eq(RolesTable.organizationId, parsed.data.organizationId),
                eq(RolesTable.scope, parsed.data.scope),
            ),
        );

    await db
        .update(RolesTable)
        .set({ isDefault: true })
        .where(eq(RolesTable.id, parsed.data.roleId));

    revalidatePath("/");

    return { success: true as const, message: "Default role updated" };
}

export async function syncOrganizationAuthorization(
    input: SyncAuthorizationInput,
) {
    const parsed = syncAuthorizationSchema.safeParse(input);
    if (!parsed.success) {
        return validationError(parsed.error);
    }

    const currentUser = await getCurrentUser({ redirectIfNotFound: true });

    const membership = await getActiveOrgMembershipWithRole(
        currentUser.id,
        parsed.data.organizationId,
    );

    if (!isOwnerMembership(membership)) {
        return {
            success: false as const,
            message: "Only organization owners can manage roles",
        };
    }

    await ensureOrganizationAuthorization(parsed.data.organizationId, {
        applyTemplate: parsed.data.applyTemplate ?? true,
    });

    revalidatePath("/");

    return { success: true as const, message: "Authorization defaults synced" };
}

type OnboardingOutcome =
    | { kind: "verification" }
    | { kind: "password"; password: string };

async function onboardNewUser({
    user,
    email,
    normalizedEmail,
}: {
    user: BasicUserRecord;
    email: string;
    normalizedEmail: string;
}): Promise<OnboardingOutcome> {
    const origin = await resolveAppOrigin();

    if (origin) {
        const token = createTokenValue();
        const tokenHash = hashTokenValue(token);
        const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS);
        const verificationUrl = `${origin}/verify-email?${new URLSearchParams({ token }).toString()}`;

        try {
            await db.transaction(async (trx) => {
                await trx
                    .delete(UserTokensTable)
                    .where(
                        and(
                            eq(UserTokensTable.userId, user.id),
                            eq(UserTokensTable.type, "email_verification"),
                        ),
                    );

                await trx
                    .insert(UserTokensTable)
                    .values({
                        userId: user.id,
                        tokenHash,
                        type: "email_verification",
                        expiresAt,
                        metadata: { operation: "verify", normalizedEmail },
                    });
            });

            await sendEmailVerificationEmail({
                to: email,
                name: user.displayName ?? email,
                verificationUrl,
            });

            return { kind: "verification" };
        } catch (error) {
            console.error(
                "Failed to send verification email for new team member",
                error,
            );
            await db
                .delete(UserTokensTable)
                .where(eq(UserTokensTable.tokenHash, tokenHash));
        }
    }

    const password = await generateAndAssignTemporaryPassword(user.id);
    return { kind: "password", password };
}

async function resolveAppOrigin(): Promise<string | null> {
    try {
        const headerList = await headers();
        return headerList.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? null;
    } catch (error) {
        console.error("Failed to resolve request origin", error);
        return process.env.NEXT_PUBLIC_APP_URL ?? null;
    }
}

function generateTemporaryPassword(length = 12) {
    let password = "";

    while (password.length < length) {
        password += randomBytes(6)
            .toString("base64")
            .replace(/[^a-zA-Z0-9]/g, "");
    }

    return password.slice(0, length);
}

async function generateAndAssignTemporaryPassword(
    userId: string,
): Promise<string> {
    const temporaryPassword = generateTemporaryPassword();
    const salt = generateSalt();
    const passwordHash = await hashPassword(temporaryPassword, salt);
    const now = new Date();

    await db.transaction(async (trx) => {
        const existingCredentials = await trx.query.UserCredentialsTable.findFirst({
            columns: { userId: true },
            where: eq(UserCredentialsTable.userId, userId),
        });

        if (existingCredentials) {
            await trx
                .update(UserCredentialsTable)
                .set({
                    passwordHash,
                    passwordSalt: salt,
                    mustChangePassword: true,
                    lastChangedAt: now,
                })
                .where(eq(UserCredentialsTable.userId, userId));
        } else {
            await trx
                .insert(UserCredentialsTable)
                .values({
                    userId,
                    passwordHash,
                    passwordSalt: salt,
                    mustChangePassword: true,
                });
        }

        await trx
            .update(UsersTable)
            .set({ status: "active" })
            .where(eq(UsersTable.id, userId));
    });

    return temporaryPassword;
}
