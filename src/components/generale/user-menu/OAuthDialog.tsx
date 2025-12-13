"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { OAuthConnectionControls } from "@/auth/nextjs/components/OAuthConnectionControls";
import { listOAuthConnections } from "@/auth/nextjs/oauthActions";
import type { OAuthProvider } from "@/auth/tables";
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
	const tr = useMemo(
		() =>
			(
				key: string,
				fallback: string,
				args?: Record<string, unknown>,
			) => {
				const value = t(key as any, args as any);
				return value === key ? fallback : value;
			},
		[t],
	);
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
			setStatus({
				type: "error",
				message: tr(
					"oauth.connections.loadError",
					"Unable to load OAuth connections.",
				),
			});
		} finally {
			setIsLoading(false);
		}
	}, [tr]);

	useEffect(() => {
		void loadConnections();
	}, [loadConnections]);

	const handleDisconnected = useCallback(
		(_provider: OAuthProvider, message?: string) => {
			setStatus({
				type: "success",
				message:
					message ??
					tr("oauth.connections.disconnectSuccess", "Connection removed."),
			});
			void loadConnections();
		},
		[loadConnections, tr],
	);

	const handleError = useCallback((message: string) => {
		setStatus({ type: "error", message });
	}, []);

	return (
		<DialogContent className="sm:max-w-3xl">
			<DialogHeader>
				<DialogTitle>Connected accounts</DialogTitle>
				<DialogDescription>
					Link or unlink OAuth providers you can use to access your account.
				</DialogDescription>
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
				<Muted>Loading OAuth providers…</Muted>
			) : connections.length === 0 ? (
				<Muted>
					{tr(
						"oauth.connections.empty",
						"No OAuth providers are currently configured.",
					)}
				</Muted>
			) : (
				<div className="space-y-3">
					{connections.map((connection) => {
						const connectedAt = formatDate(connection.connectedAt);
						const statusCopy = connection.connected
							? connectedAt
								? tr("oauth.connections.connectedAt", "Connected {date}", {
									date: connectedAt,
								})
								: tr("oauth.connections.connected", "Connected")
							: tr("oauth.connections.notConnected", "Not connected");

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
