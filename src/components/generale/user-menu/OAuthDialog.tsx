"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { OAuthConnectionControls } from "@/auth/nextjs/components/OAuthConnectionControls";
import { listOAuthConnections } from "@/auth/nextjs/oauthActions";
import type { OAuthProvider } from "@/auth/tables/user-oauth-accounts-table";
import {
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Muted } from "@/components/ui/typography";
import { useTranslation } from "@/lib/i18n/useTranslation";

type ConnectionItem = Awaited<ReturnType<typeof listOAuthConnections>>[number];

type Status = { type: "success" | "error"; message: string } | null;

export function OAuthDialog() {
	const { t } = useTranslation();
	const [connections, setConnections] = useState<ConnectionItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [status, setStatus] = useState<Status>(null);

	const loadConnections = useCallback(async () => {
		setIsLoading(true);
		setStatus((current) => (current?.type === "error" ? null : current));
		try {
			const result = await listOAuthConnections();
			setConnections(result);
		} catch (error) {
			console.error("Failed to load OAuth connections", error);
			setStatus({ type: "error", message: t("authTranslations.oauth.connections.loadError") });
		} finally {
			setIsLoading(false);
		}
	}, [t]);

	useEffect(() => {
		void loadConnections();
	}, [loadConnections]);

	const handleDisconnected = useCallback(
		(_provider: OAuthProvider, message?: string) => {
			setStatus({
				type: "success",
				message: message ?? t("authTranslations.oauth.connections.disconnectSuccess"),
			});
			void loadConnections();
		},
		[loadConnections, t],
	);

	const handleError = useCallback((message: string) => {
		setStatus({ type: "error", message });
	}, []);

	return (
		<DialogContent className="sm:max-w-3xl">
			<DialogHeader>
				<DialogTitle>{t("authTranslations.oauth.connections.title")}</DialogTitle>
				<DialogDescription>{t("authTranslations.oauth.connections.description")}</DialogDescription>
			</DialogHeader>
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
			{isLoading ? (
				<Muted>{t("authTranslations.oauth.connections.loading")}</Muted>
			) : connections.length === 0 ? (
				<Muted>{t("authTranslations.oauth.connections.empty")}</Muted>
			) : (
				<div className="space-y-3">
					{connections.map((connection) => {
						const connectedAt = formatDate(connection.connectedAt);
						const statusCopy = connection.connected
							? connectedAt
								? t("authTranslations.oauth.connections.connectedAt", { date: connectedAt })
								: t("authTranslations.oauth.connections.connected")
							: t("authTranslations.oauth.connections.notConnected");

						return (
							<div
								key={connection.provider}
								className="flex items-center justify-between rounded-md border border-muted-foreground/20 p-3"
							>
								<div>
									<p className="font-medium">{connection.displayName}</p>
									<p className="text-sm text-muted-foreground">{statusCopy}</p>
								</div>
								<OAuthConnectionControls
									provider={connection.provider}
									connected={connection.connected}
									onDisconnected={handleDisconnected}
									onError={handleError}
								/>
							</div>
						);
					})}
				</div>
			)}
		</DialogContent>
	);
}

function formatDate(value: Date | string | null) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}
