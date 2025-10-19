"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { authMessage, isFeatureEnabled } from "@/auth/config";
import { SESSION_COOKIE_KEY } from "@/auth/core/constants";
import { revokeSessionById } from "@/auth/core/session";
import { getCurrentUser } from "@/auth/nextjs/currentUser";
import { SessionsTable } from "@/auth/tables";
import { db } from "@/drizzle/db";

export type SessionListItem = {
	id: string;
	createdAt: Date;
	lastActiveAt: Date;
	expiresAt: Date;
	status: string;
	ipAddress: string | null;
	userAgent: string | null;
	device: string | null;
	platform: string | null;
	country: string | null;
	city: string | null;
	isCurrent: boolean;
};

function featureDisabledMessage() {
	return authMessage(
		"sessions.featureDisabled",
		"Session management is disabled for this workspace.",
	);
}

export async function listOwnSessions(): Promise<SessionListItem[]> {
	if (!isFeatureEnabled("sessions")) {
		return [];
	}

	const currentUser = await getCurrentUser({ redirectIfNotFound: true });

	const sessions = await db.query.SessionsTable.findMany({
		columns: {
			id: true,
			createdAt: true,
			lastActiveAt: true,
			expiresAt: true,
			status: true,
			ipAddress: true,
			userAgent: true,
			device: true,
			platform: true,
			country: true,
			city: true,
		},
		where: and(
			eq(SessionsTable.userId, currentUser.id),
			eq(SessionsTable.status, "active"),
		),
		orderBy: desc(SessionsTable.createdAt),
	});

	return sessions.map((session) => ({
		...session,
		isCurrent: session.id === currentUser.sessionId,
	}));
}

export async function revokeSession(sessionId: string): Promise<void> {
	if (!isFeatureEnabled("sessions")) {
		throw new Error(featureDisabledMessage());
	}

	const actor = await getCurrentUser({ redirectIfNotFound: true });

	const session = await db.query.SessionsTable.findFirst({
		columns: { id: true, userId: true, status: true },
		where: eq(SessionsTable.id, sessionId),
	});

	if (!session) {
		throw new Error(authMessage("sessions.error.notFound", "Session not found"));
	}

	const isOwner = session.userId === actor.id;
	const canAct = isOwner || actor.role === "admin";

	if (!canAct) {
		throw new Error(
			authMessage(
				"sessions.error.unauthorized",
				"You are not allowed to revoke this session.",
			),
		);
	}

	if (session.status === "active") {
		await revokeSessionById(sessionId, actor.id);
	}

	if (actor.sessionId === sessionId) {
		const cookieJar = await cookies();
		cookieJar.delete(SESSION_COOKIE_KEY);
	}

	revalidatePath("/");
}
