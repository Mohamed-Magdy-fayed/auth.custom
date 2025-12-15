"use client";

import { TrashIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { deleteOrganization, setActiveOrganization } from "../server/actions";

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
	const router = useRouter();
	const [status, setStatus] = useState<{
		type: "success" | "error";
		message: string;
	}>();
	const [isPending, startTransition] = useTransition();

	if (organizations.length === 0) {
		return (
			<p className="text-sm text-muted-foreground">{t("authTranslations.org.switcher.empty")}</p>
		);
	}

	const handleDelete = async (organizationId: string) => {
		setStatus(undefined);

		const result = await deleteOrganization(organizationId);
		if (!result.success) {
			if (result.message) {
				setStatus({ type: "error", message: result.message });
			}
			return result;
		}

		setStatus({ type: "success", message: result.message });
		router.refresh();
		return result;
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

			router.refresh();
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
					role={status.type === "success" ? "status" : "alert"}
					aria-live={status.type === "success" ? "polite" : "assertive"}
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
							{org.isDefault && <Badge>{t("authTranslations.org.switcher.activeBadge")}</Badge>}
							{!org.isDefault && org.status !== "active" && (
								<Badge variant="outline">
									{(() => {
										const statusKey: `authTranslations.org.status.${Organization["status"]}` = `authTranslations.org.status.${org.status}`;
										const statusLabel = t(statusKey);
										return statusLabel === statusKey ? org.status : statusLabel;
									})()}
								</Badge>
							)}
							<ActionButton
								size="icon-sm"
								variant="ghost"
								action={() => handleDelete(org.id)}
								requireAreYouSure
							>
								<TrashIcon />
							</ActionButton>
						</div>
						{org.description && (
							<p className="text-xs text-muted-foreground">{org.description}</p>
						)}
						<p className="text-xs text-muted-foreground">
							{t("authTranslations.org.switcher.slugLabel")} {org.slug}
						</p>
					</div>
					<Button
						variant="outline"
						size="sm"
						disabled={org.isDefault || isPending}
						onClick={() => handleSelect(org.id)}
					>
						{org.isDefault
							? t("authTranslations.org.switcher.current")
							: isPending
								? t("authTranslations.org.switcher.switching")
								: t("authTranslations.org.switcher.setActive")}
					</Button>
				</div>
			))}
		</div>
	);
}
