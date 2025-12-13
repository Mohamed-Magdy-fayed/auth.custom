import { env } from "@/data/env/server";
import { SESSION_COOKIE_KEY, SESSION_EXPIRATION_SECONDS } from "./constants";

// Keep session handling cookie-only with a compact HMAC-signed JWT.
// No database state is required; integrity is verified via JWT_SECRET_KEY.

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

export type PartialUser = {
	id: string;
	name?: string | null;
	email?: string | null;
	phone?: string | null;
	imageUrl?: string | null;
	role?: string | null;
	screens?: string[] | null;
	branchId?: string | null;
};

export type SessionPayload = {
	sessionId: string;
	exp: number;
	user: PartialUser;
};

const secretKey = env.JWT_SECRET_KEY;

if (!secretKey || secretKey.length < 32) {
	throw new Error(
		"JWT_SECRET_KEY is not set or is too short. It must be at least 32 characters.",
	);
}

function base64UrlEncode(data: string) {
	return Buffer.from(data, "utf8")
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "");
}

function base64UrlDecode(encoded: string) {
	let input = encoded.replace(/-/g, "+").replace(/_/g, "/");
	while (input.length % 4) input += "=";
	return Buffer.from(input, "base64").toString("utf8");
}

async function getCryptoKey() {
	const keyData = new TextEncoder().encode(secretKey);
	return crypto.subtle.importKey(
		"raw",
		keyData,
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign", "verify"],
	);
}

export async function createSession(
	user: PartialUser,
	cookies: Pick<Cookies, "set">,
): Promise<void> {
	const expirationTime =
		Math.floor(Date.now() / 1000) + SESSION_EXPIRATION_SECONDS;
	const payload: SessionPayload = {
		sessionId: crypto.randomUUID(),
		exp: expirationTime,
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			phone: user.phone,
			imageUrl: user.imageUrl,
			role: user.role ?? null,
			screens: user.screens ?? null,
			branchId: user.branchId ?? null,
		},
	};

	const header = { alg: "HS256", typ: "JWT" };
	const encodedHeader = base64UrlEncode(JSON.stringify(header));
	const encodedPayload = base64UrlEncode(JSON.stringify(payload));
	const dataToSign = `${encodedHeader}.${encodedPayload}`;

	const key = await getCryptoKey();
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(dataToSign),
	);
	const encodedSignature = base64UrlEncode(
		String.fromCharCode(...new Uint8Array(signature)),
	);

	const token = `${dataToSign}.${encodedSignature}`;

	cookies.set(SESSION_COOKIE_KEY, token, {
		secure: env.NODE_ENV === "production",
		httpOnly: true,
		sameSite: "lax",
		path: "/",
		expires: new Date(expirationTime * 1000),
	});
}

export async function getSessionFromCookie(
	cookies: Pick<Cookies, "get">,
): Promise<SessionPayload["user"] | null> {
	const token = cookies.get(SESSION_COOKIE_KEY)?.value;
	if (!token) return null;

	const parts = token.split(".");
	if (parts.length !== 3) return null;

	const [encodedHeader, encodedPayload, encodedSignature] = parts;
	const key = await getCryptoKey();
	const dataToVerify = `${encodedHeader}.${encodedPayload}`;
	const signature = new Uint8Array(
		Array.from(base64UrlDecode(encodedSignature), (c) => c.charCodeAt(0)),
	);

	const isValid = await crypto.subtle.verify(
		"HMAC",
		key,
		signature,
		new TextEncoder().encode(dataToVerify),
	);

	if (!isValid) return null;

	const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;
	if (Date.now() > payload.exp * 1000) return null;

	return payload.user;
}

export function removeSession(cookies: Pick<Cookies, "delete">) {
	cookies.delete(SESSION_COOKIE_KEY);
}

export async function refreshSession(cookies: Pick<Cookies, "get" | "set">) {
	const session = await getSessionFromCookie(cookies);
	if (!session) return;

	await createSession(session, cookies);
}
