"use client";

import { useEffect, useMemo, useState } from "react";

import { authMessage } from "@/auth/config";
import { AddTeamMemberForm } from "@/auth/nextjs/components/AddTeamMemberForm";
import { RolePermissionsManager } from "@/auth/nextjs/components/RolePermissionsManager";
import { TeamMembersManager } from "@/auth/nextjs/components/TeamMembersManager";
import { TeamStructureManager } from "@/auth/nextjs/components/TeamStructureManager";
import {
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Muted, Small } from "@/components/ui/typography";
import type { TeamDialogData } from "./types";

export type TeamsDialogProps = { data: TeamDialogData };

export function TeamsDialog({ data }: TeamsDialogProps) {
    const { activeOrganization, teams, canManageAny, authorization: initialAuthorization } = data;
    const [authorization, setAuthorization] = useState(initialAuthorization);

    useEffect(() => {
        setAuthorization(initialAuthorization);
    }, [initialAuthorization]);

    const manageableTeams = useMemo(
        () => teams.filter((team) => team.canManageMembers),
        [teams],
    );
    const teamScopedRoles = useMemo(
        () => authorization.roles.filter((role) => role.scope === "team"),
        [authorization.roles],
    );
    const inviteDisabledReason = canManageAny
        ? undefined
        : teams.length === 0
            ? authMessage("org.section.inviteNoTeams", "Create a team first")
            : authMessage(
                "org.section.inviteNoPermission",
                "Only organization owners or team managers can invite members",
            );

    if (!activeOrganization) {
        return (
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Teams &amp; members</DialogTitle>
                    <DialogDescription>
                        Create or join an organization before managing teams and memberships.
                    </DialogDescription>
                </DialogHeader>
                <Muted>
                    You&apos;re not part of an active organization yet. Pick or create one from
                    the organizations menu, then return here to manage teams.
                </Muted>
            </DialogContent>
        );
    }

    return (
        <DialogContent className="sm:max-w-5xl">
            <DialogHeader>
                <DialogTitle>{activeOrganization.name}</DialogTitle>
                <DialogDescription>
                    Manage teams, invite members, and review access within this workspace.
                </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="people" className="space-y-6">
                <TabsList className="w-full">
                    <TabsTrigger value="people">People</TabsTrigger>
                    <TabsTrigger value="structure">Structure</TabsTrigger>
                    <TabsTrigger value="permissions" disabled={!authorization.roles.length}>
                        Permissions
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="people" className="space-y-6">
                    <section className="space-y-3">
                        <Small className="uppercase tracking-wider text-muted-foreground">
                            Invite members
                        </Small>
                        <AddTeamMemberForm
                            teams={manageableTeams.map((team) => ({ id: team.id, name: team.name }))}
                            teamRoles={teamScopedRoles.map((role) => ({
                                id: role.id,
                                name: role.name,
                                description: role.description,
                                isDefault: role.isDefault,
                            }))}
                            disabledReason={inviteDisabledReason}
                        />
                    </section>
                    <section className="space-y-3">
                        <Small className="uppercase tracking-wider text-muted-foreground">
                            Team roster
                        </Small>
                        <TeamMembersManager
                            teams={teams.map((team) => ({
                                id: team.id,
                                name: team.name,
                                canManageMembers: team.canManageMembers,
                            }))}
                            canManageAny={canManageAny}
                            teamRoles={teamScopedRoles.map((role) => ({
                                id: role.id,
                                name: role.name,
                                description: role.description,
                                isDefault: role.isDefault,
                            }))}
                        />
                    </section>
                </TabsContent>
                <TabsContent value="structure" className="space-y-6">
                    <TeamStructureManager
                        organization={activeOrganization}
                        teams={teams}
                        authorization={authorization}
                        onAuthorizationChange={setAuthorization}
                    />
                </TabsContent>
                <TabsContent value="permissions" className="space-y-6">
                    <RolePermissionsManager
                        organizationId={activeOrganization.id}
                        authorization={authorization}
                        onAuthorizationChange={setAuthorization}
                    />
                    {!authorization.canEdit && (
                        <Muted>
                            {authMessage(
                                "teams.permissions.readOnly",
                                "Only organization owners can change workspace roles and permissions.",
                            )}
                        </Muted>
                    )}
                </TabsContent>
            </Tabs>
        </DialogContent>
    );
}
