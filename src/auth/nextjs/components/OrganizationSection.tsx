import { authMessage } from "@/auth/config";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

import {
	getOrganizationAuthorization,
	getOrganizationTeams,
	getUserOrganizations,
} from "../org/actions";
import { AddTeamMemberForm } from "./AddTeamMemberForm";
import { CreateOrganizationForm } from "./CreateOrganizationForm";
import { CreateTeamForm } from "./CreateTeamForm";
import { OrganizationSwitcher } from "./OrganizationSwitcher";
import { TeamMembersManager } from "./TeamMembersManager";

export async function OrganizationSection() {
	const organizations = await getUserOrganizations();
	const activeOrganization =
		organizations.find((org) => org.isDefault) ?? organizations[0] ?? null;

	const [teamResult, authorization] = activeOrganization
		? await Promise.all([
				getOrganizationTeams(activeOrganization.id),
				getOrganizationAuthorization(activeOrganization.id),
			])
		: [
				{ teams: [], isOwner: false, canManage: false },
				{ roles: [], canEdit: false, isOwner: false, permissionCatalog: [] },
			];

	const { teams, isOwner, canManage } = teamResult;
	const teamRoles = authorization.roles.filter((role) => role.scope === "team");

	const manageableTeams = teams.filter((team) => team.canManageMembers);
	const canManageAny = canManage;
	const inviteDisabledReason = canManageAny
		? undefined
		: teams.length === 0
			? authMessage("org.section.inviteNoTeams", "Create a team first")
			: authMessage(
					"org.section.inviteNoPermission",
					"Only organization owners or team managers can invite members",
				);
	const teamCountLabel = authMessage(
		"org.section.teamCount",
		`${teams.length} ${teams.length === 1 ? "team" : "teams"}`,
		{
			count: String(teams.length),
			singular: authMessage("org.section.teamSingular", "team"),
			plural: authMessage("org.section.teamPlural", "teams"),
		},
	);

	return (
		<div className="space-y-6">
			<div className="grid gap-4 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>
							{authMessage("org.section.yourOrganizationsTitle", "Your organizations")}
						</CardTitle>
						<CardDescription>
							{authMessage(
								"org.section.yourOrganizationsDescription",
								"Switch between the organizations you belong to and review their details.",
							)}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<OrganizationSwitcher organizations={organizations} />
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>
							{authMessage("org.section.createOrgTitle", "Create a new organization")}
						</CardTitle>
						<CardDescription>
							{authMessage(
								"org.section.createOrgDescription",
								"Spin up a fresh workspace for a new group or initiative.",
							)}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<CreateOrganizationForm />
					</CardContent>
				</Card>
			</div>

			{activeOrganization ? (
				<Card>
					<CardHeader>
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<div className="flex items-center gap-2">
									<CardTitle className="text-xl">{activeOrganization.name}</CardTitle>
									{isOwner && (
										<Badge variant="outline">
											{authMessage("org.section.ownerBadge", "Owner access")}
										</Badge>
									)}
								</div>
								<CardDescription>
									{authMessage("org.section.activeOrgPrefix", "Active organization")} •{" "}
									{teamCountLabel}
								</CardDescription>
							</div>
							<Badge variant="outline">
								{authMessage("org.section.slugLabel", "Slug")}:{" "}
								{activeOrganization.slug}
							</Badge>
						</div>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="space-y-3">
							<h3 className="text-lg font-semibold">
								{authMessage("org.section.teamsHeading", "Teams")}
							</h3>
							{teams.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									{authMessage(
										"org.section.noTeams",
										"No teams yet. Create one to start grouping members.",
									)}
								</p>
							) : (
								<ul className="space-y-2">
									{teams.map((team) => (
										<li
											key={team.id}
											className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
										>
											<div className="space-y-1">
												<div className="flex items-center gap-2">
													<p className="text-sm font-medium">{team.name}</p>
													{team.isManager && (
														<Badge variant="outline">
															{authMessage("org.section.managerBadge", "Manager")}
														</Badge>
													)}
												</div>
												{team.description && (
													<p className="text-xs text-muted-foreground">{team.description}</p>
												)}
											</div>
											<Badge variant="outline">
												{authMessage(
													"org.section.memberCount",
													`${team.memberCount} ${team.memberCount === 1 ? "member" : "members"}`,
													{
														count: String(team.memberCount),
														singular: authMessage("org.section.memberSingular", "member"),
														plural: authMessage("org.section.memberPlural", "members"),
													},
												)}
											</Badge>
										</li>
									))}
								</ul>
							)}
						</div>
						<div className="grid gap-4 lg:grid-cols-3">
							<Card>
								<CardHeader>
									<CardTitle>
										{authMessage("org.section.createTeamTitle", "Create a team")}
									</CardTitle>
									<CardDescription>
										{authMessage(
											"org.section.createTeamDescription",
											"Organize people into focused groups under this organization.",
										)}
									</CardDescription>
								</CardHeader>
								<CardContent>
									{isOwner ? (
										<CreateTeamForm
											organizationId={activeOrganization.id}
											parentTeams={teams.map((team) => ({ id: team.id, name: team.name }))}
										/>
									) : (
										<p className="text-sm text-muted-foreground">
											{authMessage(
												"org.section.createTeamOwnerOnly",
												"Only organization owners can create teams.",
											)}
										</p>
									)}
								</CardContent>
							</Card>
							<Card>
								<CardHeader>
									<CardTitle>
										{authMessage("org.section.addMemberTitle", "Add someone to a team")}
									</CardTitle>
									<CardDescription>
										{authMessage(
											"org.section.addMemberDescription",
											"Invite an existing account into one of your teams by email.",
										)}
									</CardDescription>
								</CardHeader>
								<CardContent>
									<AddTeamMemberForm
										teams={manageableTeams.map((team) => ({
											id: team.id,
											name: team.name,
										}))}
										disabledReason={inviteDisabledReason}
										teamRoles={teamRoles.map((role) => ({
											id: role.id,
											name: role.name,
											description: role.description,
											isDefault: role.isDefault,
										}))}
									/>
								</CardContent>
							</Card>
							<Card className="lg:col-span-1 lg:row-span-1">
								<CardHeader>
									<CardTitle>
										{authMessage("org.section.teamMembersTitle", "Team members")}
									</CardTitle>
									<CardDescription>
										{authMessage(
											"org.section.teamMembersDescription",
											"Review and remove members from your teams.",
										)}
									</CardDescription>
								</CardHeader>
								<CardContent>
									<TeamMembersManager
										teams={teams.map((team) => ({
											id: team.id,
											name: team.name,
											canManageMembers: team.canManageMembers,
										}))}
										canManageAny={canManageAny}
										teamRoles={teamRoles.map((role) => ({
											id: role.id,
											name: role.name,
											description: role.description,
											isDefault: role.isDefault,
										}))}
									/>
								</CardContent>
							</Card>
						</div>
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardHeader>
						<CardTitle>
							{authMessage("org.section.getStartedTitle", "Get started")}
						</CardTitle>
						<CardDescription>
							{authMessage(
								"org.section.getStartedDescription",
								"Create your first organization to unlock team management tools.",
							)}
						</CardDescription>
					</CardHeader>
				</Card>
			)}
		</div>
	);
}
