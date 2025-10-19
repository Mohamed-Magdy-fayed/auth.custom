"use client";

import { useCallback, useEffect, useState } from "react";
import { authMessage, isFeatureEnabled } from "@/auth/config";
import {
	listOwnSessions,
	revokeSession,
} from "@/auth/features/sessions/server/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Muted } from "@/components/ui/typography";

type SessionItem = Awaited<
	ReturnType<typeof listOwnSessions>
> extends (infer Item)[]
	? Item
	: never;

type Status = { type: "success" | "error"; message: string } | null;

export function SessionsDialog() {
	const featureEnabled = isFeatureEnabled("sessions");
	const [sessions, setSessions] = useState<SessionItem[]>([]);
	const [status, setStatus] = useState<Status>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [busyId, setBusyId] = useState<string | null>(null);

	const loadSessions = useCallback(async () => {
		setIsLoading(true);
		try {
			if (!featureEnabled) {
				setSessions([]);
				return;
			}

			const result = await listOwnSessions();
			setSessions(result);
		} catch (error) {
			console.error("Failed to load sessions", error);
			setSessions([]);
			setStatus({ type: "error", message: "Unable to load sessions" });
		} finally {
			setIsLoading(false);
		}
	}, [featureEnabled]);

	useEffect(() => {
		void loadSessions();
	}, [loadSessions]);

	const handleRevoke = useCallback(
		async (sessionId: string) => {
			setBusyId(sessionId);
			setStatus(null);
			try {
				if (!featureEnabled) {
					setStatus({
						type: "error",
						message: authMessage(
							"sessions.featureDisabled",
							"Session management is disabled.",
						),
					});
					return;
				}

				await revokeSession(sessionId);
				setStatus({ type: "success", message: "Session revoked" });
				await loadSessions();
			} catch (error) {
				console.error("Failed to revoke session", error);
				setStatus({ type: "error", message: "Unable to revoke session" });
			} finally {
				setBusyId(null);
			}
		},
		[featureEnabled, loadSessions],
	);

	return (
		<DialogContent className="sm:max-w-3xl">
			<DialogHeader>
				<DialogTitle>Active sessions</DialogTitle>
				<DialogDescription>
					Review devices that can access your account and revoke any you don&apos;t
					recognise.
				</DialogDescription>
			</DialogHeader>
			{featureEnabled ? (
				isLoading ? (
					<Muted>Loading sessions…</Muted>
				) : sessions.length === 0 ? (
					<Muted>No sessions found.</Muted>
				) : (
					<div className="space-y-4">
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
						<div className="space-y-3">
							{sessions.map((session) => (
								<div
									key={session.id}
									className="rounded-lg border border-border bg-card p-4"
								>
									<div className="flex flex-wrap items-center justify-between gap-3">
										<div>
											<p className="text-sm font-semibold">
												{session.device ??
													authMessage("session.device.unknown", "Unknown device")}
											</p>
											<p className="text-xs text-muted-foreground">
												{session.userAgent
													? parseUserAgent(session.userAgent)
													: authMessage("session.platform.unknown", "Unknown platform")}
											</p>
										</div>
										<div className="flex items-center gap-2">
											<Badge variant={session.isCurrent ? "default" : "outline"}>
												{session.isCurrent
													? authMessage("session.status.current", "Current")
													: formatStatus(session.status)}
											</Badge>
											<Button
												variant="outline"
												size="sm"
												disabled={
													session.isCurrent ||
													session.status !== "active" ||
													busyId === session.id
												}
												onClick={() => void handleRevoke(session.id)}
											>
												{busyId === session.id ? "Revoking..." : "Revoke"}
											</Button>
										</div>
									</div>
									<div className="mt-3 space-y-1 text-xs text-muted-foreground">
										<p>
											<span className="font-medium text-foreground">Last active:</span>{" "}
											{formatDate(session.lastActiveAt)}
										</p>
										<p>
											<span className="font-medium text-foreground">Created:</span>{" "}
											{formatDate(session.createdAt)}
										</p>
										<p>
											<span className="font-medium text-foreground">Expires:</span>{" "}
											{formatDate(session.expiresAt)}
										</p>
										{(session.city || session.country || session.ipAddress) && (
											<p>
												<span className="font-medium text-foreground">Location:</span>{" "}
												{[session.city, session.country, session.ipAddress]
													.filter(Boolean)
													.join(" · ")}
											</p>
										)}
									</div>
								</div>
							))}
						</div>
					</div>
				)
			) : (
				<Muted>
					{authMessage(
						"sessions.featureDisabled",
						"Session management is disabled for this workspace.",
					)}
				</Muted>
			)}
		</DialogContent>
	);
}

function formatDate(value: Date | string | null | undefined) {
	if (!value) return "--";
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "--";
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}

function formatStatus(status: string) {
	switch (status) {
		case "active":
			return authMessage("session.status.active", "Active");
		case "revoked":
			return authMessage("session.status.revoked", "Revoked");
		case "expired":
			return authMessage("session.status.expired", "Expired");
		default:
			return status;
	}
}

// create a function that translate the useragent to a human readable version
function parseUserAgent(userAgent: string) {
	const browserMatch = userAgent.match(
		/(chrome|firefox|safari|edge|opera|msie|trident)/i,
	);
	const osMatch = userAgent.match(
		/(windows nt|mac os x|linux|android|iphone|ipad)/i,
	);

	const browser = browserMatch ? browserMatch[0] : "Unknown browser";
	const os = osMatch ? osMatch[0] : "Unknown OS";
	return `${browser} on ${os}`;
}
