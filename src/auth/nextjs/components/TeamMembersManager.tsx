"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { authMessage } from "@/auth/config";
import { SelectField } from "@/components/generale/select-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	getTeamMembers,
	removeTeamMember,
	setTeamMemberManager,
	setTeamMemberRole,
} from "../org/actions";

type TeamSummary = { id: string; name: string; canManageMembers: boolean };

type TeamMembersManagerProps = {
	teams: TeamSummary[];
	canManageAny: boolean;
	teamRoles: Array<{
		id: string;
		name: string;
		description: string | null;
		isDefault: boolean;
	}>;
};

type Member = {
	id: string;
	email: string | null;
	name: string | null;
	status: string;
	isManager: boolean | null;
	roleId: string | null;
	roleName: string | null;
};

export function TeamMembersManager({
	teams,
	canManageAny,
	teamRoles,
}: TeamMembersManagerProps) {
	const [selectedTeamId, setSelectedTeamId] = useState<string>(
		teams[0]?.id ?? "",
	);
	const [members, setMembers] = useState<Member[]>([]);
	const [status, setStatus] = useState<{
		type: "success" | "error";
		message: string;
	}>();
	const [isFetching, startFetching] = useTransition();
	const [isMutating, startMutating] = useTransition();
	const [pendingAction, setPendingAction] = useState<{
		memberId: string;
		type: "remove" | "manager" | "role";
	}>();

	const hasTeams = teams.length > 0;
	const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? null;

	const loadMembers = useCallback((teamId: string) => {
		if (!teamId) {
			setMembers([]);
			return;
		}

		startFetching(async () => {
			try {
				const result = await getTeamMembers(teamId);
				setMembers(result);
				setStatus(undefined);
			} catch (error) {
				console.error(error);
				setMembers([]);
				setStatus({ type: "error", message: "Unable to load team members" });
			}
		});
	}, []);

	useEffect(() => {
		if (!hasTeams) {
			setSelectedTeamId("");
			setMembers([]);
			return;
		}

		setSelectedTeamId((prev) => {
			const exists = teams.some((team) => team.id === prev);
			return exists ? prev : teams[0]!.id;
		});
	}, [hasTeams, teams]);

	useEffect(() => {
		if (selectedTeamId) {
			loadMembers(selectedTeamId);
		}
	}, [loadMembers, selectedTeamId]);

	const handleSelectTeam = (teamId: string) => {
		setStatus(undefined);
		setSelectedTeamId(teamId);
		loadMembers(teamId);
	};

	const handleRefresh = () => {
		if (!selectedTeamId) return;
		setStatus(undefined);
		loadMembers(selectedTeamId);
	};

	const handleRemoveMember = (userId: string) => {
		if (!selectedTeamId) return;

		const targetTeam = teams.find((team) => team.id === selectedTeamId);
		if (!targetTeam?.canManageMembers) {
			setStatus({
				type: "error",
				message: authMessage(
					"teams.members.manageNotAllowed",
					"You cannot manage members on that team",
				),
			});
			return;
		}

		startMutating(async () => {
			setPendingAction({ memberId: userId, type: "remove" });
			setStatus(undefined);
			try {
				const result = await removeTeamMember(selectedTeamId, userId);

				if (!result.success) {
					if (result.message) {
						setStatus({ type: "error", message: result.message });
					}
					return;
				}

				setMembers((current) => current.filter((member) => member.id !== userId));

				if (result.message) {
					setStatus({ type: "success", message: result.message });
				}
			} catch (error) {
				console.error(error);
				setStatus({
					type: "error",
					message: authMessage(
						"teams.members.removeError",
						"Unable to remove member",
					),
				});
			} finally {
				setPendingAction(undefined);
			}
		});
	};

	const handleToggleManager = (userId: string, nextState: boolean) => {
		if (!selectedTeamId) return;

		const targetTeam = teams.find((team) => team.id === selectedTeamId);
		if (!targetTeam?.canManageMembers) {
			setStatus({
				type: "error",
				message: authMessage(
					"teams.members.managerNotAllowed",
					"You cannot update roles on that team",
				),
			});
			return;
		}

		startMutating(async () => {
			setPendingAction({ memberId: userId, type: "manager" });
			setStatus(undefined);
			try {
				const result = await setTeamMemberManager({
					teamId: selectedTeamId,
					userId,
					isManager: nextState,
				});

				if (!result.success) {
					if (result.message) {
						setStatus({ type: "error", message: result.message });
					}
					return;
				}

				setMembers((current) =>
					current.map((member) =>
						member.id === userId ? { ...member, isManager: nextState } : member,
					),
				);

				if (result.message) {
					setStatus({ type: "success", message: result.message });
				}
			} catch (error) {
				console.error(error);
				setStatus({
					type: "error",
					message: authMessage(
						"teams.members.managerError",
						"Unable to update manager status",
					),
				});
			} finally {
				setPendingAction(undefined);
			}
		});
	};

	const handleChangeRole = (userId: string, nextRoleId: string | null) => {
		if (!selectedTeamId) return;

		const targetTeam = teams.find((team) => team.id === selectedTeamId);
		if (!targetTeam?.canManageMembers) {
			setStatus({
				type: "error",
				message: authMessage(
					"teams.members.roleNotAllowed",
					"You cannot update roles on that team",
				),
			});
			return;
		}

		startMutating(async () => {
			setPendingAction({ memberId: userId, type: "role" });
			setStatus(undefined);
			try {
				const result = await setTeamMemberRole({
					teamId: selectedTeamId,
					userId,
					roleId: nextRoleId,
				});

				if (!result.success) {
					if (result.message) {
						setStatus({ type: "error", message: result.message });
					}
					return;
				}

				const nextRole = teamRoles.find((role) => role.id === nextRoleId);

				setMembers((current) =>
					current.map((member) =>
						member.id === userId
							? {
									...member,
									roleId: nextRole?.id ?? null,
									roleName: nextRole?.name ?? null,
								}
							: member,
					),
				);

				if (result.message) {
					setStatus({ type: "success", message: result.message });
				}
			} catch (error) {
				console.error(error);
				setStatus({
					type: "error",
					message: authMessage(
						"teams.members.roleError",
						"Unable to update member role",
					),
				});
			} finally {
				setPendingAction(undefined);
			}
		});
	};

	if (!hasTeams) {
		return (
			<p className="text-sm text-muted-foreground">
				{authMessage(
					"teams.members.noTeamsMessage",
					"Create a team to start managing members.",
				)}
			</p>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<label className="text-sm font-medium" htmlFor="team-members-select">
					{authMessage("teams.members.selectLabel", "Select a team")}
				</label>
				<div className="flex w-full items-center gap-2 sm:w-auto">
					<SelectField
						options={teams.map((team) => ({ label: team.name, value: team.id }))}
						setValues={(vals) => handleSelectTeam(vals[0] || "")}
						values={selectedTeamId ? [selectedTeamId] : []}
						title="Teams"
					/>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={handleRefresh}
						disabled={isFetching || !selectedTeamId}
					>
						{authMessage("teams.members.refresh", "Refresh")}
					</Button>
				</div>
			</div>

			{status && (
				<p
					className={
						status.type === "success"
							? "text-sm text-emerald-600"
							: "text-sm text-destructive"
					}
				>
					{status.message}
				</p>
			)}
			{!canManageAny && hasTeams && (
				<p className="text-xs text-muted-foreground">
					{authMessage(
						"teams.members.readOnlyMessage",
						"You can view members, but only organization owners or team managers can make changes.",
					)}
				</p>
			)}

			<div className="space-y-2">
				{isFetching ? (
					<p className="text-sm text-muted-foreground">
						{authMessage("teams.members.loading", "Loading members…")}
					</p>
				) : members.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						{authMessage("teams.members.empty", "No members in this team yet.")}
					</p>
				) : (
					members.map((member) => (
						<div
							key={member.id}
							className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
						>
							<div className="space-y-1">
								<p className="text-sm font-medium">
									{member.name ??
										member.email ??
										authMessage("teams.members.unnamed", "Unnamed user")}
								</p>
								{member.email && (
									<p className="text-xs text-muted-foreground">{member.email}</p>
								)}
								<div className="flex flex-wrap gap-2">
									<Badge variant="outline">{member.status}</Badge>
									<Badge variant="secondary">
										{member.roleName ?? authMessage("teams.members.noRole", "No role")}
									</Badge>
									{member.isManager ? (
										<Badge>{authMessage("teams.members.manager", "Manager")}</Badge>
									) : null}
								</div>
							</div>
							{selectedTeam?.canManageMembers ? (
								<div className="flex flex-wrap gap-2">
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="outline"
												size="sm"
												disabled={isMutating && pendingAction?.memberId === member.id}
											>
												{isMutating &&
												pendingAction?.memberId === member.id &&
												pendingAction.type === "role"
													? authMessage("teams.members.updatingRole", "Updating...")
													: (member.roleName ??
														authMessage("teams.members.assignRole", "Assign role"))}
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end" className="min-w-44">
											<DropdownMenuItem
												disabled={member.roleId === null}
												onSelect={() => handleChangeRole(member.id, null)}
											>
												{authMessage("teams.members.noRole", "No role")}
											</DropdownMenuItem>
											{teamRoles.map((role) => (
												<DropdownMenuItem
													key={role.id}
													disabled={member.roleId === role.id}
													onSelect={() => handleChangeRole(member.id, role.id)}
												>
													{role.name}
													{role.isDefault ? (
														<span className="ml-auto text-xs text-muted-foreground">
															{authMessage("teams.members.defaultRole", "Default")}
														</span>
													) : null}
												</DropdownMenuItem>
											))}
										</DropdownMenuContent>
									</DropdownMenu>
									<Button
										variant={member.isManager ? "secondary" : "outline"}
										size="sm"
										disabled={isMutating}
										onClick={() => handleToggleManager(member.id, !member.isManager)}
									>
										{isMutating &&
										pendingAction?.memberId === member.id &&
										pendingAction.type === "manager"
											? authMessage("teams.members.updatingManager", "Updating...")
											: member.isManager
												? authMessage("teams.members.removeManager", "Remove manager")
												: authMessage("teams.members.makeManager", "Make manager")}
									</Button>
									<Button
										variant="outline"
										size="sm"
										disabled={isMutating}
										onClick={() => handleRemoveMember(member.id)}
									>
										{isMutating &&
										pendingAction?.memberId === member.id &&
										pendingAction.type === "remove"
											? authMessage("teams.members.removing", "Removing...")
											: authMessage("teams.members.remove", "Remove")}
									</Button>
								</div>
							) : null}
						</div>
					))
				)}
			</div>
		</div>
	);
}
