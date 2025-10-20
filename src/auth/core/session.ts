import { eq } from "drizzle-orm";

import { SessionsTable, UsersTable } from "@/auth/tables";
import { db } from "@/drizzle/db";
import {
	DEFAULT_ROLE_KEY,
	SESSION_COOKIE_KEY,
	SESSION_EXPIRATION_SECONDS,
} from "./constants";

const secretKey = process.env.JWT_SECRET_KEY;

if (!secretKey || secretKey.length < 32) {
	throw new Error(
		"JWT_SECRET_KEY is not set or is too short. It must be at least 32 characters.",
	);
}

export type Cookies = {
	set: (
		key: string,
		value: string,
		options: {
			secure?: boolean;
			httpOnly?: boolean;
			sameSite?: "strict" | "lax";
			expires?: Date;
			path?: string;
		},
	) => void;
	get: (key: string) => { name: string; value: string } | undefined;
	delete: (key: string, options?: { path?: string }) => void;
};

type SessionContext = {
	ipAddress?: string;
	userAgent?: string;
	device?: string;
	platform?: string;
	country?: string;
	city?: string;
};

type ActiveSession = { id: string; role: string; sessionId: string };

const TOKEN_BYTE_SIZE = 32;

const textEncoder = new TextEncoder();

let cachedCrypto: Crypto | null = null;

async function getCrypto(): Promise<Crypto> {
	if (cachedCrypto) return cachedCrypto;

	if (typeof globalThis.crypto !== "undefined") {
		cachedCrypto = globalThis.crypto as Crypto;
		return cachedCrypto;
	}

	const { webcrypto } = await import("crypto");
	cachedCrypto = webcrypto as unknown as Crypto;
	return cachedCrypto;
}

function bytesToHex(bytes: Uint8Array) {
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
		"",
	);
}

async function createSessionToken() {
	const crypto = await getCrypto();
	const bytes = new Uint8Array(TOKEN_BYTE_SIZE);
	crypto.getRandomValues(bytes);
	return bytesToHex(bytes);
}

async function generateSessionId(existing?: string) {
	if (existing) return existing;

	const crypto = await getCrypto();
	if (typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}

	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = bytesToHex(bytes);
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function hashSessionToken(sessionId: string, token: string) {
	const crypto = await getCrypto();
	const data = textEncoder.encode(`${sessionId}.${token}.${secretKey}`);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	return bytesToHex(new Uint8Array(hashBuffer));
}

function resolvePrimaryRole(
	assignments?: Array<{ role?: { key?: string } | null }>,
) {
	return (
		assignments?.find((assignment) => assignment.role?.key)?.role?.key ??
		DEFAULT_ROLE_KEY
	);
}

function parseCookie(value: string | undefined) {
	if (!value) return null;
	const [sessionId, token] = value.split(".");
	if (!sessionId || !token) return null;
	return { sessionId, token };
}

export async function createSession(
	user: { id: string; role: string; sessionId?: string },
	cookies: Pick<Cookies, "set">,
	context: SessionContext = {},
) {
	const sessionId = await generateSessionId(user.sessionId);
	const token = await createSessionToken();
	const tokenHash = await hashSessionToken(sessionId, token);
	const expiresAt = new Date(Date.now() + SESSION_EXPIRATION_SECONDS * 1000);
	const now = new Date();
	const metadata = {
		ipAddress: context.ipAddress ?? null,
		userAgent: context.userAgent ?? null,
		device: context.device ?? null,
		platform: context.platform ?? null,
		country: context.country ?? null,
		city: context.city ?? null,
	};

	if (user.sessionId) {
		await db
			.update(SessionsTable)
			.set({
				sessionTokenHash: tokenHash,
				refreshTokenHash: null,
				expiresAt,
				lastActiveAt: now,
				status: "active",
				revokedAt: null,
				revokedBy: null,
				...metadata,
			})
			.where(eq(SessionsTable.id, sessionId));
	} else {
		await db
			.insert(SessionsTable)
			.values({
				id: sessionId,
				userId: user.id,
				sessionTokenHash: tokenHash,
				expiresAt,
				lastActiveAt: now,
				status: "active",
				...metadata,
			});
	}

	cookies.set(SESSION_COOKIE_KEY, `${sessionId}.${token}`, {
		secure: process.env.NODE_ENV === "production",
		httpOnly: true,
		sameSite: "lax",
		path: "/",
		expires: expiresAt,
	});
}

export async function getSessionFromCookie(
	cookies: Pick<Cookies, "get">,
): Promise<ActiveSession | null> {
	const parsed = parseCookie(cookies.get(SESSION_COOKIE_KEY)?.value);
	if (!parsed) return null;

	const session = await db.query.SessionsTable.findFirst({
		columns: {
			id: true,
			userId: true,
			sessionTokenHash: true,
			expiresAt: true,
			status: true,
		},
		where: eq(SessionsTable.id, parsed.sessionId),
	});

	if (session == null) return null;
	if (session.status !== "active") return null;
	if (session.expiresAt.getTime() <= Date.now()) {
		await db
			.update(SessionsTable)
			.set({ status: "expired" })
			.where(eq(SessionsTable.id, session.id));
		return null;
	}

	const expectedHash = await hashSessionToken(parsed.sessionId, parsed.token);
	if (expectedHash !== session.sessionTokenHash) {
		await revokeSessionById(session.id);
		return null;
	}

	const user = await db.query.UsersTable.findFirst({
		columns: { id: true, status: true },
		where: eq(UsersTable.id, session.userId),
		with: {
			roleAssignments: { columns: {}, with: { role: { columns: { key: true } } } },
		},
	});

	if (!user || user.status !== "active") {
		await revokeSessionById(session.id, user?.id);
		return null;
	}

	await db
		.update(SessionsTable)
		.set({ lastActiveAt: new Date() })
		.where(eq(SessionsTable.id, session.id));

	return {
		id: user.id,
		role: resolvePrimaryRole(user.roleAssignments),
		sessionId: session.id,
	};
}

export async function revokeSessionById(sessionId: string, revokedBy?: string) {
	await db
		.update(SessionsTable)
		.set({
			status: "revoked",
			revokedAt: new Date(),
			revokedBy: revokedBy ?? null,
		})
		.where(eq(SessionsTable.id, sessionId));
}

export async function removeSession(cookies: Pick<Cookies, "delete" | "get">) {
	const parsed = parseCookie(cookies.get(SESSION_COOKIE_KEY)?.value);
	if (parsed) {
		await revokeSessionById(parsed.sessionId);
	}

	cookies.delete(SESSION_COOKIE_KEY, { path: "/" });
}

export async function refreshSession(cookies: Pick<Cookies, "get" | "set">) {
	const session = await getSessionFromCookie(cookies);
	if (!session) return;

	await createSession(session, cookies);
}
