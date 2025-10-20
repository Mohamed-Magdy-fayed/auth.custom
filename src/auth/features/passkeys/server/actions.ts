"use server";

import type {
	AuthenticationResponseJSON,
	AuthenticatorTransportFuture,
	PublicKeyCredentialCreationOptionsJSON,
	PublicKeyCredentialRequestOptionsJSON,
	RegistrationResponseJSON,
	Uint8Array_,
	WebAuthnCredential,
} from "@simplewebauthn/server";
import {
	generateAuthenticationOptions,
	generateRegistrationOptions,
	verifyAuthenticationResponse,
	verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";

import { authMessage, isFeatureEnabled } from "@/auth/config";
import { DEFAULT_ROLE_KEY } from "@/auth/core/constants";
import { createSession } from "@/auth/core/session";
import { hashTokenValue } from "@/auth/core/token";
import { getCurrentUser } from "@/auth/nextjs/currentUser";
import { getSessionContext } from "@/auth/nextjs/sessionContext";
import {
	BiometricCredentialsTable,
	UsersTable,
	UserTokensTable,
} from "@/auth/tables";
import { db } from "@/drizzle/db";
import { base64UrlToBuffer, bufferToBase64Url } from "@/lib/webauthn/encoding";

const PASSKEY_CHALLENGE_TTL_MS = 1000 * 60 * 10;
const RP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Gateling Auth";
const textEncoder = new TextEncoder();

export type PasskeyListItem = {
	id: string;
	label: string | null;
	createdAt: string;
	lastUsedAt: string | null;
	isBackupEligible: boolean;
	isBackupState: boolean;
	transports: string[];
};

type ActionResult = { success: boolean; message: string };

type RegistrationOptionsResult =
	| { success: true; options: PublicKeyCredentialCreationOptionsJSON }
	| { success: false; message: string };

type AuthenticationOptionsResult =
	| {
		success: true;
		options: PublicKeyCredentialRequestOptionsJSON;
		email: string;
	}
	| { success: false; message: string };

function disabledActionResult(): ActionResult {
	return {
		success: false,
		message: authMessage(
			"passkeys.featureDisabled",
			"Passkey authentication is disabled for this workspace.",
		),
	};
}

function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

async function resolveOrigin() {
	const headerList = await headers();
	const origin = headerList.get("origin");

	if (origin) return origin;
	if (process.env.NEXT_PUBLIC_APP_URL) {
		return process.env.NEXT_PUBLIC_APP_URL;
	}

	const forwardedProto = headerList.get("x-forwarded-proto");
	const forwardedHost = headerList.get("x-forwarded-host");
	const host = forwardedHost ?? headerList.get("host");

	if (!host) return undefined;

	const protocol =
		forwardedProto ??
		(host.startsWith("localhost") || host.startsWith("127.0.0.1")
			? "http"
			: "https");

	return `${protocol}://${host}`;
}

function getRpId(origin: string) {
	try {
		return new URL(origin).hostname;
	} catch (error) {
		console.error("Unable to derive RP ID", error);
		return null;
	}
}

async function upsertChallengeToken(options: {
	userId: string;
	challenge: string;
	operation: "passkey-registration" | "passkey-authentication";
}) {
	const challengeHash = hashTokenValue(options.challenge);
	const expiresAt = new Date(Date.now() + PASSKEY_CHALLENGE_TTL_MS);

	await db
		.delete(UserTokensTable)
		.where(
			and(
				eq(UserTokensTable.userId, options.userId),
				eq(UserTokensTable.type, "device_trust"),
			),
		);

	await db
		.insert(UserTokensTable)
		.values({
			userId: options.userId,
			tokenHash: challengeHash,
			type: "device_trust",
			expiresAt,
			metadata: { operation: options.operation, challenge: options.challenge },
		});
}

async function consumeChallengeToken(options: {
	userId: string;
	operation: "passkey-registration" | "passkey-authentication";
}) {
	const record = await db.query.UserTokensTable.findFirst({
		columns: {
			id: true,
			metadata: true,
			expiresAt: true,
			consumedAt: true,
			tokenHash: true,
		},
		where: and(
			eq(UserTokensTable.userId, options.userId),
			eq(UserTokensTable.type, "device_trust"),
		),
		orderBy: [desc(UserTokensTable.createdAt)],
	});

	if (!record) return null;

	const metadata = (record.metadata ?? {}) as Record<string, unknown>;
	if (metadata.operation !== options.operation) {
		return null;
	}

	const challenge =
		typeof metadata.challenge === "string" ? metadata.challenge : null;

	if (!challenge) {
		await db.delete(UserTokensTable).where(eq(UserTokensTable.id, record.id));
		return null;
	}

	if (record.consumedAt != null || record.expiresAt.getTime() <= Date.now()) {
		await db.delete(UserTokensTable).where(eq(UserTokensTable.id, record.id));
		return null;
	}

	if (hashTokenValue(challenge) !== record.tokenHash) {
		await db.delete(UserTokensTable).where(eq(UserTokensTable.id, record.id));
		return null;
	}

	return { id: record.id, challenge };
}

async function revokeChallengeToken(tokenId: string) {
	await db.delete(UserTokensTable).where(eq(UserTokensTable.id, tokenId));
}

function mapPasskeyRecord(record: {
	id: string;
	label: string | null;
	createdAt: Date;
	lastUsedAt: Date | null;
	isBackupEligible: boolean;
	isBackupState: boolean;
	transports: unknown;
}): PasskeyListItem {
	return {
		id: record.id,
		label: record.label,
		createdAt: record.createdAt.toISOString(),
		lastUsedAt: record.lastUsedAt?.toISOString() ?? null,
		isBackupEligible: record.isBackupEligible,
		isBackupState: record.isBackupState,
		transports: Array.isArray(record.transports)
			? (record.transports as string[])
			: [],
	};
}

export async function listPasskeys(): Promise<PasskeyListItem[]> {
	if (!isFeatureEnabled("passkeys")) {
		return [];
	}

	const user = await getCurrentUser({
		redirectIfNotFound: true,
		withFullUser: true,
	});

	const credentials = await db.query.BiometricCredentialsTable.findMany({
		columns: {
			id: true,
			label: true,
			createdAt: true,
			lastUsedAt: true,
			isBackupEligible: true,
			isBackupState: true,
			transports: true,
		},
		where: eq(BiometricCredentialsTable.userId, user.id),
		orderBy: (table, { desc }) => desc(table.createdAt),
	});

	return credentials.map(mapPasskeyRecord);
}

export async function beginPasskeyRegistration(): Promise<RegistrationOptionsResult> {
	if (!isFeatureEnabled("passkeys")) {
		return {
			success: false,
			message: authMessage(
				"passkeys.featureDisabled",
				"Passkey authentication is disabled for this workspace.",
			),
		};
	}

	const user = await getCurrentUser({
		redirectIfNotFound: true,
		withFullUser: true,
	});

	const origin = await resolveOrigin();
	if (!origin) {
		return {
			success: false,
			message: authMessage(
				"passkeys.error.missingOrigin",
				"Unable to determine relying party origin.",
			),
		};
	}

	const rpId = getRpId(origin);
	if (!rpId) {
		return {
			success: false,
			message: authMessage(
				"passkeys.error.missingRpId",
				"Unable to determine relying party identifier.",
			),
		};
	}

	const existing = await db.query.BiometricCredentialsTable.findMany({
		columns: { credentialId: true, transports: true },
		where: eq(BiometricCredentialsTable.userId, user.id),
	});

	const encodedUserId = textEncoder.encode(user.id);
	const userIdBytes = new Uint8Array(
		encodedUserId.buffer,
		encodedUserId.byteOffset,
		encodedUserId.byteLength,
	) as Uint8Array<ArrayBuffer>;

	const options = await generateRegistrationOptions({
		rpName: RP_NAME,
		rpID: rpId,
		userID: userIdBytes,
		userName: user.email,
		userDisplayName: user.name ?? user.email,
		attestationType: "none",
		authenticatorSelection: {
			residentKey: "preferred",
			userVerification: "preferred",
		},
		excludeCredentials: existing.map((credential) => ({
			id: credential.credentialId,
			type: "public-key",
			transports: Array.isArray(credential.transports)
				? (credential.transports as AuthenticatorTransportFuture[])
				: undefined,
		})),
	});

	await upsertChallengeToken({
		userId: user.id,
		challenge: options.challenge,
		operation: "passkey-registration",
	});

	return { success: true, options };
}

export async function completePasskeyRegistration(
	attestation: RegistrationResponseJSON,
): Promise<ActionResult> {
	if (!isFeatureEnabled("passkeys")) {
		return disabledActionResult();
	}

	const user = await getCurrentUser({
		redirectIfNotFound: true,
		withFullUser: true,
	});

	const challenge = await consumeChallengeToken({
		userId: user.id,
		operation: "passkey-registration",
	});

	if (!challenge) {
		return {
			success: false,
			message: authMessage(
				"passkeys.register.invalidChallenge",
				"Passkey registration challenge is no longer valid.",
			),
		};
	}

	const origin = await resolveOrigin();
	if (!origin) {
		await revokeChallengeToken(challenge.id);
		return {
			success: false,
			message: authMessage(
				"passkeys.error.missingOrigin",
				"Unable to determine relying party origin.",
			),
		};
	}

	const rpId = getRpId(origin);
	if (!rpId) {
		await revokeChallengeToken(challenge.id);
		return {
			success: false,
			message: authMessage(
				"passkeys.error.missingRpId",
				"Unable to determine relying party identifier.",
			),
		};
	}

	const verification = await verifyRegistrationResponse({
		response: attestation,
		expectedChallenge: challenge.challenge,
		expectedOrigin: origin,
		expectedRPID: rpId,
		requireUserVerification: true,
	});

	if (!verification.verified || !verification.registrationInfo) {
		await revokeChallengeToken(challenge.id);
		return {
			success: false,
			message: authMessage(
				"passkeys.register.error",
				"Unable to verify passkey registration.",
			),
		};
	}

	const { credential, credentialDeviceType, credentialBackedUp, userVerified } =
		verification.registrationInfo;

	const credentialId = credential.id;
	const credentialPublicKey = credential.publicKey;
	const transports = Array.isArray(credential.transports)
		? credential.transports
		: attestation.response.transports &&
			Array.isArray(attestation.response.transports)
			? attestation.response.transports
			: null;

	await db
		.delete(BiometricCredentialsTable)
		.where(eq(BiometricCredentialsTable.credentialId, credentialId));

	await db
		.insert(BiometricCredentialsTable)
		.values({
			userId: user.id,
			credentialId,
			publicKey: bufferToBase64Url(credentialPublicKey),
			signCount: credential.counter,
			label: null,
			transports,
			isBackupEligible: credentialDeviceType === "multiDevice",
			isBackupState: credentialBackedUp,
			isUserVerified: userVerified,
		});

	await revokeChallengeToken(challenge.id);
	revalidatePath("/");

	return {
		success: true,
		message: authMessage(
			"passkeys.register.success",
			"Passkey registered successfully.",
		),
	};
}

export async function deletePasskey(id: string): Promise<ActionResult> {
	if (!isFeatureEnabled("passkeys")) {
		return disabledActionResult();
	}

	const user = await getCurrentUser({ redirectIfNotFound: true });

	const credential = await db.query.BiometricCredentialsTable.findFirst({
		columns: { id: true, userId: true },
		where: eq(BiometricCredentialsTable.id, id),
	});

	if (!credential || credential.userId !== user.id) {
		return {
			success: false,
			message: authMessage(
				"passkeys.delete.notFound",
				"Passkey could not be found.",
			),
		};
	}

	await db
		.delete(BiometricCredentialsTable)
		.where(eq(BiometricCredentialsTable.id, credential.id));

	revalidatePath("/");

	return {
		success: true,
		message: authMessage(
			"passkeys.delete.success",
			"Passkey removed successfully.",
		),
	};
}

export async function beginPasskeyAuthentication(
	email: string,
): Promise<AuthenticationOptionsResult> {
	if (!isFeatureEnabled("passkeys")) {
		return {
			success: false,
			message: authMessage(
				"passkeys.featureDisabled",
				"Passkey authentication is disabled for this workspace.",
			),
		};
	}

	const normalizedEmail = normalizeEmail(email);
	const user = await db.query.UsersTable.findFirst({
		columns: { id: true, email: true, status: true, locale: true },
		where: eq(UsersTable.emailNormalized, normalizedEmail),
		with: {
			biometricCredentials: { columns: { credentialId: true, transports: true } },
		},
	});

	if (!user || user.status !== "active") {
		return {
			success: false,
			message: authMessage(
				"passkeys.auth.error.userNotFound",
				"No active account found for this email.",
			),
		};
	}

	if (!user?.biometricCredentials || user.biometricCredentials.length === 0) {
		return {
			success: false,
			message: authMessage(
				"passkeys.auth.error.noCredentials",
				"No passkeys are registered for this account.",
			),
		};
	}

	const origin = await resolveOrigin();
	if (!origin) {
		return {
			success: false,
			message: authMessage(
				"passkeys.error.missingOrigin",
				"Unable to determine relying party origin.",
			),
		};
	}

	const rpId = getRpId(origin);
	if (!rpId) {
		return {
			success: false,
			message: authMessage(
				"passkeys.error.missingRpId",
				"Unable to determine relying party identifier.",
			),
		};
	}

	const options = await generateAuthenticationOptions({
		rpID: rpId,
		allowCredentials: user.biometricCredentials.map((credential) => ({
			id: credential.credentialId,
			type: "public-key",
			transports: Array.isArray(credential.transports)
				? (credential.transports as AuthenticatorTransportFuture[])
				: undefined,
		})),
		userVerification: "preferred",
	});

	await upsertChallengeToken({
		userId: user.id,
		challenge: options.challenge,
		operation: "passkey-authentication",
	});

	return { success: true, options, email: user.email };
}

export async function completePasskeyAuthentication(
	email: string,
	assertion: AuthenticationResponseJSON,
): Promise<ActionResult> {
	if (!isFeatureEnabled("passkeys")) {
		return disabledActionResult();
	}

	const normalizedEmail = normalizeEmail(email);
	const user = await db.query.UsersTable.findFirst({
		columns: { id: true, email: true, status: true },
		where: eq(UsersTable.emailNormalized, normalizedEmail),
		with: {
			biometricCredentials: {
				columns: {
					id: true,
					credentialId: true,
					publicKey: true,
					signCount: true,
					transports: true,
					isBackupEligible: true,
					isBackupState: true,
				},
			},
			roleAssignments: { columns: {}, with: { role: { columns: { key: true } } } },
		},
	});

	if (!user || user.status !== "active") {
		return {
			success: false,
			message: authMessage(
				"passkeys.auth.error.userNotFound",
				"No active account found for this email.",
			),
		};
	}

	const challenge = await consumeChallengeToken({
		userId: user.id,
		operation: "passkey-authentication",
	});

	if (!challenge) {
		return {
			success: false,
			message: authMessage(
				"passkeys.auth.error.invalidChallenge",
				"Passkey sign-in challenge has expired.",
			),
		};
	}

	const origin = await resolveOrigin();
	if (!origin) {
		await revokeChallengeToken(challenge.id);
		return {
			success: false,
			message: authMessage(
				"passkeys.error.missingOrigin",
				"Unable to determine relying party origin.",
			),
		};
	}

	const rpId = getRpId(origin);
	if (!rpId) {
		await revokeChallengeToken(challenge.id);
		return {
			success: false,
			message: authMessage(
				"passkeys.error.missingRpId",
				"Unable to determine relying party identifier.",
			),
		};
	}

	const credential = user.biometricCredentials.find(
		(item) => item.credentialId === assertion.id,
	);

	if (!credential) {
		await revokeChallengeToken(challenge.id);
		return {
			success: false,
			message: authMessage(
				"passkeys.auth.error.credentialMismatch",
				"This passkey does not match our records.",
			),
		};
	}

	const storedCredential: WebAuthnCredential = {
		id: credential.credentialId,
		publicKey: base64UrlToBuffer(credential.publicKey) as Uint8Array_,
		counter: credential.signCount ?? 0,
		transports: Array.isArray(credential.transports)
			? (credential.transports as AuthenticatorTransportFuture[])
			: undefined,
	};

	const verification = await verifyAuthenticationResponse({
		response: assertion,
		expectedChallenge: challenge.challenge,
		expectedOrigin: origin,
		expectedRPID: rpId,
		credential: storedCredential,
		requireUserVerification: true,
	});

	if (!verification.verified || !verification.authenticationInfo) {
		await revokeChallengeToken(challenge.id);
		return {
			success: false,
			message: authMessage(
				"passkeys.auth.error.generic",
				"Unable to verify passkey response.",
			),
		};
	}

	const { newCounter, credentialID, credentialDeviceType, credentialBackedUp } =
		verification.authenticationInfo;

	await db
		.update(BiometricCredentialsTable)
		.set({
			signCount: newCounter,
			lastUsedAt: new Date(),
			isBackupEligible: credentialDeviceType === "multiDevice",
			isBackupState: credentialBackedUp,
			isUserVerified: verification.authenticationInfo.userVerified ?? true,
		})
		.where(eq(BiometricCredentialsTable.id, credential.id));

	await revokeChallengeToken(challenge.id);

	const primaryRole =
		user.roleAssignments?.find((assignment) => assignment.role?.key)?.role?.key ??
		DEFAULT_ROLE_KEY;

	await createSession(
		{ id: user.id, role: primaryRole },
		await cookies(),
		await getSessionContext(),
	);

	await db
		.update(UsersTable)
		.set({ lastSignInAt: new Date() })
		.where(eq(UsersTable.id, user.id));

	revalidatePath("/");

	return {
		success: true,
		message: authMessage(
			"passkeys.auth.success",
			"Signed in successfully with passkey.",
		),
	};
}
