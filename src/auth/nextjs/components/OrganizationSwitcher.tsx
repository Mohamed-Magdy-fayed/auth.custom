"use client";

import { TrashIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { deleteOrganization, setActiveOrganization } from "../org/actions";

type Organization = {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	status: "active" | "inactive" | "pending";
	isDefault: boolean;
};

type OrganizationSwitcherProps = { organizations: Organization[] };

export function OrganizationSwitcher({
	organizations,
}: OrganizationSwitcherProps) {
	const { t } = useTranslation();
	const [status, setStatus] = useState<{
		type: "success" | "error";
		message: string;
	}>();
	const [isPending, startTransition] = useTransition();

	if (organizations.length === 0) {
		return (
			<p className="text-sm text-muted-foreground">
				{t("org.switcher.empty")}
			</p>
		);
	}

	const handleDelete = (organizationId: string) => {
		startTransition(async () => {
			setStatus(undefined);

			const result = await deleteOrganization(organizationId);

			if (!result.success) {
				if (result.message) {
					setStatus({ type: "error", message: result.message });
				}
				return;
			}

			setStatus({ type: "success", message: result.message });
		});
	};

	const handleSelect = (organizationId: string) => {
		startTransition(async () => {
			setStatus(undefined);

			const result = await setActiveOrganization(organizationId);

			if (!result.success) {
				if (result.message) {
					setStatus({ type: "error", message: result.message });
				}
				return;
			}

			if (result.message) {
				setStatus({ type: "success", message: result.message });
			}
		});
	};

	return (
		<div className="space-y-3">
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
			{organizations.map((org) => (
				<div
					key={org.id}
					className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
				>
					<div className="space-y-1">
						<div className="flex items-center gap-2">
							<span className="text-sm font-medium">{org.name}</span>
							{org.isDefault && (
								<Badge>{t("org.switcher.activeBadge")}</Badge>
							)}
							{!org.isDefault && org.status !== "active" && (
								<Badge variant="outline">
									{(() => {
										const statusKey: `org.status.${Organization["status"]}` = `org.status.${org.status}`;
										const statusLabel = t(statusKey);
										return statusLabel === statusKey ? org.status : statusLabel;
									})()}
								</Badge>
							)}
							<ActionButton
								size="icon-sm"
								variant="ghost"
								action={deleteOrganization.bind(null, org.id)}
								requireAreYouSure
							>
								<TrashIcon />
							</ActionButton>
						</div>
						{org.description && (
							<p className="text-xs text-muted-foreground">{org.description}</p>
						)}
						<p className="text-xs text-muted-foreground">
							{t("org.switcher.slugLabel")} {org.slug}
						</p>
					</div>
					<Button
						variant="outline"
						size="sm"
						disabled={org.isDefault || isPending}
						onClick={() => handleSelect(org.id)}
					>
						{org.isDefault
							? t("org.switcher.current")
							: isPending
								? t("org.switcher.switching")
								: t("org.switcher.setActive")}
					</Button>
				</div>
			))}
		</div>
	);
}
