import { eq } from "drizzle-orm";

import { isFeatureEnabled } from "@/auth/config";
import { listPasskeys } from "@/auth/features/passkeys/server/actions";
import { getCurrentUser } from "@/auth/nextjs/currentUser";
import {
    getOrganizationAuthorization,
    getOrganizationTeams,
    getUserOrganizations,
} from "@/auth/nextjs/org/actions";
import { UserCredentialsTable } from "@/auth/tables";
import type { TeamDialogData } from "@/components/generale/user-menu/types";
import { db } from "@/drizzle/db";

export type AppShellContext = Awaited<ReturnType<typeof loadAppContext>>;

export async function loadAppContext() {
    const currentSessionUser = await getCurrentUser({ redirectIfNotFound: true });
    const fullUser = await getCurrentUser({
        redirectIfNotFound: true,
        withFullUser: true,
    });
    const passkeysEnabled = isFeatureEnabled("passkeys");

    const [passkeys, credentials, organizations] = await Promise.all([
        passkeysEnabled ? listPasskeys() : Promise.resolve([]),
        db.query.UserCredentialsTable.findFirst({
            columns: { userId: true },
            where: eq(UserCredentialsTable.userId, fullUser.id),
        }),
        getUserOrganizations(),
    ]);

    const activeOrganization =
        organizations.find((org) => org.isDefault) ?? organizations[0] ?? null;

    let teamsResult: Awaited<ReturnType<typeof getOrganizationTeams>> = {
        teams: [],
        canManage: false,
        isOwner: false,
    };
    let authorization: TeamDialogData["authorization"] = {
        canEdit: false,
        isOwner: false,
        roles: [],
        permissionCatalog: [],
    };

    if (activeOrganization) {
        const [teams, authz] = await Promise.all([
            getOrganizationTeams(activeOrganization.id),
            getOrganizationAuthorization(activeOrganization.id),
        ]);
        teamsResult = teams;
        authorization = authz;
    }

    const teamData: TeamDialogData = {
        activeOrganization,
        teams: teamsResult.teams,
        canManageAny: teamsResult.canManage,
        authorization,
    };

    const profileName = fullUser.name ?? "";
    const initials = getInitials(profileName);
    const isAdmin = currentSessionUser.role === "admin";
    const hasPassword = credentials != null;
    const emailVerified = fullUser.emailVerifiedAt != null;

    return {
        currentSessionUser,
        fullUser,
        passkeys,
        organizations,
        teamData,
        profileName,
        initials,
        isAdmin,
        hasPassword,
        emailVerified,
    };
}

function getInitials(value: string) {
    const words = value.trim().split(/\s+/);
    if (words.length === 0) return "?";
    if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
    return (
        words[0]!.charAt(0) + words[words.length - 1]!.charAt(0)
    ).toUpperCase();
}
