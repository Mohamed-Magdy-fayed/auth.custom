"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
	useTransition,
} from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { authMessage } from "@/auth/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Muted, Small } from "@/components/ui/typography";
import {
	createRole,
	deleteRole,
	getOrganizationAuthorization,
	setRoleDefault,
	updateRole,
} from "../org/actions";
import { createRoleSchema } from "../org/schemas";
import type {
	AuthorizationRoleSummary,
	AuthorizationSummary,
} from "../org/types";
import { CreateTeamForm } from "./CreateTeamForm";

const roleDetailsSchema = createRoleSchema.pick({
	name: true,
	description: true,
});
type RoleFormValues = z.infer<typeof roleDetailsSchema>;

type RoleFormResult =
	| { success: true; message?: string }
	| { success: false; message?: string; fieldErrors?: Record<string, string[]> };

type RoleFormState =
	| { kind: "create"; scope: "organization" | "team" }
	| { kind: "edit"; role: AuthorizationRoleSummary }
	| null;

const emptyRoleValues: RoleFormValues = { name: "", description: "" };

function sanitizeDescription(value?: string | null) {
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

type RoleFormProps = {
	mode: "create" | "edit";
	defaultValues: RoleFormValues;
	submitLabel: string;
	pendingLabel: string;
	onSubmit: (values: RoleFormValues) => Promise<RoleFormResult>;
	onCancel: () => void;
	onSuccess: (message?: string) => void;
};

function RoleForm({
	mode,
	defaultValues,
	submitLabel,
	pendingLabel,
	onSubmit,
	onCancel,
	onSuccess,
}: RoleFormProps) {
	const [status, setStatus] = useState<string>();
	const [isPending, startTransition] = useTransition();

	const form = useForm<RoleFormValues>({
		resolver: zodResolver(roleDetailsSchema),
		defaultValues,
	});

	useEffect(() => {
		form.reset(defaultValues);
	}, [defaultValues, form]);

	const handleSubmit = form.handleSubmit((values) => {
		startTransition(async () => {
			form.clearErrors();
			setStatus(undefined);

			const result = await onSubmit({
				name: values.name.trim(),
				description: values.description?.trim() ?? "",
			});

			if (!result.success) {
				if (result.fieldErrors) {
					for (const [field, messages] of Object.entries(result.fieldErrors)) {
						const message = messages?.[0];
						if (message) {
							form.setError(field as keyof RoleFormValues, {
								type: "server",
								message,
							});
						}
					}
				}
				if (result.message) {
					setStatus(result.message);
				}
				return;
			}

			onSuccess(result.message);
		});
	});

	return (
		<Form {...form}>
			<form onSubmit={handleSubmit} className="space-y-4">
				{status ? <p className="text-sm text-destructive">{status}</p> : null}
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{authMessage("teams.roles.name", "Role name")}</FormLabel>
							<FormControl>
								<Input
									placeholder={authMessage(
										"teams.roles.name.placeholder",
										mode === "create" ? "Support specialist" : "Updated role name",
									)}
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="description"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								{authMessage("teams.roles.description", "Description")}
							</FormLabel>
							<FormControl>
								<Textarea
									placeholder={authMessage(
										"teams.roles.description.placeholder",
										"Optional details to help teammates understand this role.",
									)}
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="flex justify-end gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={onCancel}
						disabled={isPending}
					>
						{authMessage("actions.cancel", "Cancel")}
					</Button>
					<Button type="submit" disabled={isPending}>
						{isPending ? pendingLabel : submitLabel}
					</Button>
				</div>
			</form>
		</Form>
	);
}

type TeamStructureManagerProps = {
	organization: { id: string; name: string } | null;
	teams: Array<{
		id: string;
		name: string;
		description: string | null;
		memberCount: number;
		canManageMembers: boolean;
	}>;
	authorization: AuthorizationSummary;
	onAuthorizationChange?: (summary: AuthorizationSummary) => void;
};

export function TeamStructureManager({
	organization,
	teams,
	authorization,
	onAuthorizationChange,
}: TeamStructureManagerProps) {
	const [roleFormState, setRoleFormState] = useState<RoleFormState>(null);
	const [roleStatus, setRoleStatus] = useState<{
		type: "success" | "error";
		message: string;
	}>();
	const [isRoleActionPending, startRoleAction] = useTransition();

	const organizationRoles = useMemo(
		() => authorization.roles.filter((role) => role.scope === "organization"),
		[authorization.roles],
	);
	const teamRoles = useMemo(
		() => authorization.roles.filter((role) => role.scope === "team"),
		[authorization.roles],
	);

	const refreshAuthorization = useCallback(async () => {
		if (!organization) return false;
		try {
			const summary = await getOrganizationAuthorization(organization.id);
			onAuthorizationChange?.(summary);
			return true;
		} catch (error) {
			console.error(error);
			setRoleStatus({
				type: "error",
				message: authMessage(
					"teams.roles.refreshError",
					"Unable to refresh roles. Please try again.",
				),
			});
			return false;
		}
	}, [organization, onAuthorizationChange]);

	const buildErrorResult = (
		message?: string,
		fieldErrors?: Record<string, string[]> | undefined,
	): RoleFormResult => ({ success: false, message, fieldErrors });

	const handleCreateRole = useCallback(
		async (
			scope: "organization" | "team",
			values: RoleFormValues,
		): Promise<RoleFormResult> => {
			if (!organization) {
				return buildErrorResult(
					authMessage(
						"teams.roles.noOrganization",
						"Select an organization before managing roles.",
					),
				);
			}

			const result = await createRole({
				organizationId: organization.id,
				scope,
				name: values.name.trim(),
				description: sanitizeDescription(values.description),
			});

			if (!result.success) {
				return buildErrorResult(
					result.message,
					"fieldErrors" in result ? result.fieldErrors : undefined,
				);
			}

			return { success: true, message: result.message };
		},
		[organization],
	);

	const handleUpdateRole = useCallback(
		async (
			role: AuthorizationRoleSummary,
			values: RoleFormValues,
		): Promise<RoleFormResult> => {
			if (!organization) {
				return buildErrorResult(
					authMessage(
						"teams.roles.noOrganization",
						"Select an organization before managing roles.",
					),
				);
			}

			const result = await updateRole({
				organizationId: organization.id,
				roleId: role.id,
				name: values.name.trim(),
				description: sanitizeDescription(values.description),
			});

			if (!result.success) {
				return buildErrorResult(
					result.message,
					"fieldErrors" in result ? result.fieldErrors : undefined,
				);
			}

			return { success: true, message: result.message };
		},
		[organization],
	);

	const handleSetDefault = useCallback(
		(role: AuthorizationRoleSummary) => {
			if (!organization || role.isDefault || role.locked) {
				return;
			}

			startRoleAction(async () => {
				setRoleStatus(undefined);
				const result = await setRoleDefault({
					organizationId: organization.id,
					roleId: role.id,
					scope: role.scope,
				});

				if (!result.success) {
					if (result.message) {
						setRoleStatus({ type: "error", message: result.message });
					}
					return;
				}

				const refreshed = await refreshAuthorization();
				if (refreshed) {
					setRoleStatus({
						type: "success",
						message:
							result.message ??
							authMessage("teams.roles.defaultUpdated", "Default role updated."),
					});
				}
			});
		},
		[organization, refreshAuthorization],
	);

	const handleDeleteRole = useCallback(
		(role: AuthorizationRoleSummary) => {
			if (!organization || role.locked) {
				return;
			}

			const confirmed = window.confirm(
				authMessage(
					"teams.roles.deleteConfirm",
					"Delete this role? Make sure no members rely on it first.",
				),
			);
			if (!confirmed) return;

			startRoleAction(async () => {
				setRoleStatus(undefined);
				const result = await deleteRole({
					organizationId: organization.id,
					roleId: role.id,
				});

				if (!result.success) {
					if (result.message) {
						setRoleStatus({ type: "error", message: result.message });
					}
					return;
				}

				if (roleFormState?.kind === "edit" && roleFormState.role.id === role.id) {
					setRoleFormState(null);
				}

				const refreshed = await refreshAuthorization();
				if (refreshed) {
					setRoleStatus({
						type: "success",
						message:
							result.message ?? authMessage("teams.roles.deleted", "Role deleted."),
					});
				}
			});
		},
		[organization, refreshAuthorization, roleFormState],
	);

	const handleRoleFormSuccess = useCallback(
		async (message?: string) => {
			const refreshed = await refreshAuthorization();
			setRoleFormState(null);
			if (refreshed && message) {
				setRoleStatus({ type: "success", message });
			}
		},
		[refreshAuthorization],
	);

	const openCreateRole = (scope: "organization" | "team") => {
		setRoleStatus(undefined);
		setRoleFormState({ kind: "create", scope });
	};

	const openEditRole = (role: AuthorizationRoleSummary) => {
		setRoleStatus(undefined);
		setRoleFormState({ kind: "edit", role });
	};

	const renderRoleRow = (role: AuthorizationRoleSummary) => {
		const deleteDisabled = role.locked || role.assignmentCount > 0;
		const disableActions = !authorization.canEdit || isRoleActionPending;
		return (
			<li
				key={role.id}
				className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
			>
				<div className="space-y-1">
					<p className="text-sm font-medium">{role.name}</p>
					{role.description ? (
						<p className="text-xs text-muted-foreground">{role.description}</p>
					) : null}
					<div className="flex flex-wrap gap-2">
						<Badge variant="outline">
							{authMessage("teams.roles.assignments", "{count} assignments", {
								count: String(role.assignmentCount),
							})}
						</Badge>
						{role.isDefault ? (
							<Badge variant="secondary">
								{authMessage("teams.roles.default", "Default role")}
							</Badge>
						) : null}
						{role.locked ? (
							<Badge variant="outline">
								{authMessage("teams.roles.locked", "System role")}
							</Badge>
						) : null}
					</div>
				</div>
				{authorization.canEdit ? (
					<div className="flex flex-wrap items-center gap-2">
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={disableActions || role.locked}
							onClick={() => openEditRole(role)}
						>
							{authMessage("actions.edit", "Edit")}
						</Button>
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={disableActions || role.isDefault || role.locked}
							onClick={() => handleSetDefault(role)}
						>
							{authMessage("teams.roles.makeDefault", "Make default")}
						</Button>
						<Button
							type="button"
							size="sm"
							variant="destructive"
							disabled={disableActions || deleteDisabled}
							title={
								deleteDisabled
									? authMessage(
											"teams.roles.deleteDisabled",
											"Remove assignments before deleting this role.",
										)
									: undefined
							}
							onClick={() => handleDeleteRole(role)}
						>
							{authMessage("actions.delete", "Delete")}
						</Button>
					</div>
				) : null}
			</li>
		);
	};

	let roleForm: ReactNode = null;
	if (roleFormState) {
		const isCreate = roleFormState.kind === "create";
		const submitLabel = isCreate
			? authMessage("teams.roles.create", "Create role")
			: authMessage("teams.roles.update", "Save changes");
		const pendingLabel = isCreate
			? authMessage("teams.roles.creating", "Creating...")
			: authMessage("teams.roles.updating", "Saving...");
		const defaultValues = isCreate
			? emptyRoleValues
			: {
					name: roleFormState.role.name,
					description: roleFormState.role.description ?? "",
				};

		const submitHandler = (values: RoleFormValues) => {
			if (roleFormState.kind === "create") {
				return handleCreateRole(roleFormState.scope, values);
			}
			return handleUpdateRole(roleFormState.role, values);
		};

		roleForm = (
			<div className="rounded-lg border border-border bg-muted/20 p-4">
				<RoleForm
					mode={isCreate ? "create" : "edit"}
					defaultValues={defaultValues}
					submitLabel={submitLabel}
					pendingLabel={pendingLabel}
					onSubmit={submitHandler}
					onCancel={() => setRoleFormState(null)}
					onSuccess={handleRoleFormSuccess}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>
						{authMessage("teams.structure.title", "Team hierarchy")}
					</CardTitle>
					<CardDescription>
						{authMessage(
							"teams.structure.subtitle",
							"Organize teams and keep related work grouped together.",
						)}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{authorization.isOwner ? (
						<CreateTeamForm
							organizationId={organization?.id ?? ""}
							parentTeams={teams.map((team) => ({ id: team.id, name: team.name }))}
						/>
					) : (
						<Muted>
							{authMessage(
								"teams.structure.ownerOnly",
								"Only organization owners can create new teams.",
							)}
						</Muted>
					)}
					<div className="space-y-3">
						<Small className="uppercase tracking-wider text-muted-foreground">
							{authMessage("teams.structure.existing", "Existing teams")}
						</Small>
						{teams.length === 0 ? (
							<Muted>
								{authMessage(
									"teams.structure.empty",
									"No teams yet. Create one to get started.",
								)}
							</Muted>
						) : (
							<ul className="space-y-2">
								{teams.map((team) => (
									<li
										key={team.id}
										className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
									>
										<div className="space-y-1">
											<p className="text-sm font-medium">{team.name}</p>
											{team.description ? (
												<p className="text-xs text-muted-foreground">{team.description}</p>
											) : null}
										</div>
										<div className="flex flex-wrap items-center gap-2">
											<Badge variant="outline">
												{authMessage("teams.structure.memberCount", "{count} members", {
													count: String(team.memberCount),
												})}
											</Badge>
											{team.canManageMembers ? (
												<Badge variant="secondary">
													{authMessage("teams.structure.manageable", "You manage this team")}
												</Badge>
											) : null}
										</div>
									</li>
								))}
							</ul>
						)}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>
						{authMessage("teams.roles.title", "Workspace roles")}
					</CardTitle>
					<CardDescription>
						{authMessage(
							"teams.roles.subtitle",
							"Define reusable access levels for your organization and teams.",
						)}
					</CardDescription>
					{authorization.canEdit ? (
						<CardAction>
							<div className="flex flex-wrap gap-2">
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={() => openCreateRole("organization")}
								>
									{authMessage(
										"teams.roles.newOrganizationRole",
										"New organization role",
									)}
								</Button>
								<Button type="button" size="sm" onClick={() => openCreateRole("team")}>
									{authMessage("teams.roles.newTeamRole", "New team role")}
								</Button>
							</div>
						</CardAction>
					) : null}
				</CardHeader>
				<CardContent className="space-y-4">
					{roleStatus ? (
						<p
							className={
								roleStatus.type === "success"
									? "text-sm text-emerald-600"
									: "text-sm text-destructive"
							}
						>
							{roleStatus.message}
						</p>
					) : null}

					<div className="space-y-5">
						<div className="space-y-2">
							<Small className="uppercase tracking-wider text-muted-foreground">
								{authMessage("teams.roles.organization", "Organization roles")}
							</Small>
							{organizationRoles.length === 0 ? (
								<Muted>
									{authMessage(
										"teams.roles.organization.empty",
										"No organization roles yet.",
									)}
								</Muted>
							) : (
								<ul className="space-y-2">{organizationRoles.map(renderRoleRow)}</ul>
							)}
						</div>
						<div className="space-y-2">
							<Small className="uppercase tracking-wider text-muted-foreground">
								{authMessage("teams.roles.team", "Team roles")}
							</Small>
							{teamRoles.length === 0 ? (
								<Muted>
									{authMessage(
										"teams.roles.team.empty",
										"Create a team role to customize team-level permissions.",
									)}
								</Muted>
							) : (
								<ul className="space-y-2">{teamRoles.map(renderRoleRow)}</ul>
							)}
						</div>
					</div>

					{roleForm}

					{!authorization.canEdit ? (
						<Muted>
							{authMessage(
								"teams.roles.readOnly",
								"You can review roles, but only organization owners can modify them.",
							)}
						</Muted>
					) : null}
				</CardContent>
			</Card>
		</div>
	);
}
