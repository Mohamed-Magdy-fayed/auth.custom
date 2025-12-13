"use client";

import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	useTransition,
} from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Muted, Small } from "@/components/ui/typography";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { PermissionKey } from "../../config/permissions";
import {
	getOrganizationAuthorization,
	setRolePermissions,
} from "../org/actions";
import type {
	AuthorizationRoleSummary,
	AuthorizationSummary,
} from "../org/types";

function areSetsEqual<T>(a: Set<T>, b: Set<T>) {
	if (a.size !== b.size) return false;
	for (const value of a) {
		if (!b.has(value)) return false;
	}
	return true;
}

export type RolePermissionsManagerProps = {
	organizationId: string;
	authorization: AuthorizationSummary;
	onAuthorizationChange?: (summary: AuthorizationSummary) => void;
};

export function RolePermissionsManager({
	organizationId,
	authorization,
	onAuthorizationChange,
}: RolePermissionsManagerProps) {
	const { t } = useTranslation();
	const { roles, permissionCatalog, canEdit } = authorization;
	const [selectedRoleId, setSelectedRoleId] = useState<string | null>(
		roles[0]?.id ?? null,
	);
	const [currentPermissions, setCurrentPermissions] = useState<
		Set<PermissionKey>
	>(() => new Set(roles[0]?.permissions ?? []));
	const [status, setStatus] = useState<{
		type: "success" | "error";
		message: string;
	}>();
	const [isPending, startTransition] = useTransition();

	const selectedRole = useMemo<AuthorizationRoleSummary | null>(() => {
		if (!selectedRoleId) return null;
		return roles.find((role) => role.id === selectedRoleId) ?? null;
	}, [roles, selectedRoleId]);

	useEffect(() => {
		if (!selectedRoleId || !roles.some((role) => role.id === selectedRoleId)) {
			const fallback = roles[0]?.id ?? null;
			setSelectedRoleId(fallback);
		}
	}, [roles, selectedRoleId]);

	useEffect(() => {
		if (!selectedRole) {
			setCurrentPermissions(new Set());
			return;
		}
		setCurrentPermissions(new Set(selectedRole.permissions));
	}, [selectedRole?.id, selectedRole?.permissions]);

	const initialPermissions = useMemo(() => {
		return new Set(selectedRole?.permissions ?? []);
	}, [selectedRole?.permissions]);

	const isDirty = selectedRole
		? !areSetsEqual(initialPermissions, currentPermissions)
		: false;

	const canModify = Boolean(selectedRole) && canEdit && !selectedRole?.locked;

	const handleRefreshAuthorization = useCallback(async () => {
		try {
			const summary = await getOrganizationAuthorization(organizationId);
			onAuthorizationChange?.(summary);
		} catch (error) {
			console.error(error);
			setStatus({
				type: "error",
				message: t("teams.permissions.refreshError"),
			});
		}
	}, [organizationId, onAuthorizationChange, t]);

	const togglePermission = (key: PermissionKey) => {
		if (!canModify || isPending) return;
		setStatus(undefined);
		setCurrentPermissions((prev) => {
			const next = new Set(prev);
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}
			return next;
		});
	};

	const handleReset = () => {
		if (!selectedRole) return;
		setCurrentPermissions(new Set(selectedRole.permissions));
		setStatus(undefined);
	};

	const handleSave = () => {
		if (!selectedRole) return;

		startTransition(async () => {
			setStatus(undefined);
			const result = await setRolePermissions({
				organizationId,
				roleId: selectedRole.id,
				permissionKeys: Array.from(currentPermissions),
			});

			if (!result.success) {
				if (result.message) {
					setStatus({ type: "error", message: result.message });
				}
				return;
			}

			if (result.message) {
				setStatus({ type: "success", message: result.message });
			} else {
				setStatus({ type: "success", message: t("teams.permissions.updated") });
			}

			await handleRefreshAuthorization();
		});
	};

	if (!roles.length) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("teams.permissions.title")}</CardTitle>
					<CardDescription>{t("teams.permissions.empty")}</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader className="gap-3">
				<CardTitle>{t("teams.permissions.title")}</CardTitle>
				<CardDescription>{t("teams.permissions.subtitle")}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="grid gap-4 lg:grid-cols-[240px_1fr]">
					<div className="space-y-2">
						{roles.map((role) => {
							const isActive = role.id === selectedRole?.id;
							return (
								<button
									key={role.id}
									type="button"
									onClick={() => setSelectedRoleId(role.id)}
									className={`w-full rounded-lg border px-3 py-2 text-left transition hover:bg-accent ${isActive ? "border-primary bg-accent" : "border-border"
										}`}
								>
									<div className="flex items-center justify-between gap-2">
										<div className="flex flex-col">
											<span className="text-sm font-medium">{role.name}</span>
											<Small className="text-muted-foreground">
												{role.scope === "organization"
													? t("teams.permissions.scopeOrg")
													: t("teams.permissions.scopeTeam")}
											</Small>
										</div>
										<div className="flex flex-wrap gap-1">
											{role.isDefault ? (
												<Badge variant="secondary">
													{t("teams.permissions.default")}
												</Badge>
											) : null}
											{role.locked ? (
												<Badge variant="outline">
													{t("teams.permissions.locked")}
												</Badge>
											) : null}
										</div>
									</div>
								</button>
							);
						})}
					</div>
					<div className="space-y-4">
						{status ? (
							<p
								className={
									status.type === "success"
										? "text-sm text-emerald-600"
										: "text-sm text-destructive"
								}
							>
								{status.message}
							</p>
						) : null}

						{!selectedRole ? (
							<Muted>{t("teams.permissions.selectRole")}</Muted>
						) : (
							<div className="space-y-4">
								<div className="flex flex-wrap items-center gap-2">
									<Badge variant="outline">
										{t("teams.permissions.assignmentCount", {
											count: String(selectedRole.assignmentCount),
										})}
									</Badge>
									{selectedRole.description ? (
										<Small className="text-muted-foreground">
											{selectedRole.description}
										</Small>
									) : null}
								</div>
								{selectedRole.locked ? (
									<Muted>{t("teams.permissions.lockedMessage")}</Muted>
								) : null}
								<div className="space-y-6">
									{permissionCatalog.map((group) => (
										<div key={group.category} className="space-y-3">
											<div>
												<p className="text-sm font-semibold leading-tight">
													{group.category}
												</p>
												<Small className="text-muted-foreground">
													{t("teams.permissions.groupHelper")}
												</Small>
											</div>
											<div className="space-y-2">
												{group.items.map((item) => {
													const checked = currentPermissions.has(item.key);
													return (
														<label
															key={item.key}
															className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${checked
																	? "border-primary bg-accent"
																	: "border-border"
																} ${!canModify
																	? "cursor-not-allowed opacity-60"
																	: "hover:border-primary"
																}`}
														>
															<input
																type="checkbox"
																className="mt-1"
																checked={checked}
																disabled={!canModify || isPending}
																onChange={() => togglePermission(item.key)}
															/>
															<div>
																<p className="text-sm font-medium leading-tight">
																	{item.label}
																</p>
																<p className="text-xs text-muted-foreground leading-tight">
																	{item.description}
																</p>
															</div>
														</label>
													);
												})}
											</div>
										</div>
									))}
								</div>
								<div className="flex flex-wrap gap-2">
									<Button
										type="button"
										onClick={handleSave}
										disabled={!isDirty || !canModify || isPending}
									>
										{isPending
											? t("teams.permissions.saving")
											: t("teams.permissions.save")}
									</Button>
									<Button
										type="button"
										variant="outline"
										onClick={handleReset}
										disabled={!isDirty || isPending}
									>
										{t("teams.permissions.reset")}
									</Button>
								</div>
							</div>
						)}
					</div>
				</div>
				{!canEdit ? (
					<Muted>{t("teams.permissions.readOnly")}</Muted>
				) : null}
			</CardContent>
		</Card>
	);
}
