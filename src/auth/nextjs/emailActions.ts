"use server";

import { and, eq, ne } from "drizzle-orm";
import { headers } from "next/headers";
import { type ZodError, z } from "zod";
import { comparePasswords } from "@/auth/core/passwordHasher";
import { createTokenValue, hashTokenValue } from "@/auth/core/token";
import {
	UserCredentialsTable,
	UsersTable,
	UserTokensTable,
} from "@/auth/tables";
import { db } from "@/drizzle/db";
import { getT } from "@/lib/i18n/actions";
import { getCurrentUser } from "./currentUser";
import { sendEmailChangeVerification } from "./emails/emailChangeVerification";
import { sendEmailVerificationEmail } from "./emails/emailVerification";
import { type ChangeEmailInput, changeEmailSchema } from "./profileSchemas";

const EMAIL_VERIFICATION_TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

type ActionResult = {
	success: boolean;
	message: string;
	fieldErrors?: Record<string, string>;
};

type VerifyResult = { status: "success" | "error"; message: string };

type Translator = (
	key: string,
	fallback: string,
	args?: Record<string, unknown>,
) => string;

type EmailTokenMetadata = {
	operation?: unknown;
	newEmail?: unknown;
	normalizedEmail?: unknown;
	currentEmail?: unknown;
};

type EmailTokenRecord = { id: string; userId: string };

async function getTranslator(): Promise<Translator> {
	const { t } = await getT();

	return (key, fallback, args) => {
		const value = t(key as any, args as any);
		return value === key ? fallback : value;
	};
}

function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

async function resolveOrigin() {
	const headerList = await headers();
	return (
		headerList.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? undefined
	);
}

function buildVerificationUrl(origin: string, token: string) {
	const searchParams = new URLSearchParams({ token });
	return `${origin}/verify-email?${searchParams.toString()}`;
}

function validationError(error: ZodError, tr: Translator): ActionResult {
	const flat = z.treeifyError(error);
	const fieldErrors = Object.fromEntries(
		Object.entries(flat.errors)
			.filter(([, value]) => Array.isArray(value) && value.length > 0)
			.map(([key, value]) => [key, value as string]),
	) as Record<string, string>;

	return {
		success: false,
		message: tr("profile.error.invalidInput", "Invalid input"),
		fieldErrors,
	};
}

export async function requestEmailChange(
	unsafeData: ChangeEmailInput,
): Promise<ActionResult> {
	const tr = await getTranslator();
	const currentUser = await getCurrentUser({
		redirectIfNotFound: true,
		withFullUser: true,
	});
	const parsed = changeEmailSchema.safeParse(unsafeData);

	if (!parsed.success) {
		return validationError(parsed.error, tr);
	}

	const { newEmail, currentPassword } = parsed.data;
	const normalizedNewEmail = normalizeEmail(newEmail);
	const normalizedCurrentEmail = normalizeEmail(currentUser.email);

	if (normalizedNewEmail === normalizedCurrentEmail) {
		const message = tr(
			"profile.email.error.sameAddress",
			"Use a different email address",
		);
		return { success: false, message, fieldErrors: { newEmail: message } };
	}

	const existingUser = await db.query.UsersTable.findFirst({
		columns: { id: true },
		where: eq(UsersTable.emailNormalized, normalizedNewEmail),
	});

	if (existingUser) {
		const message = tr(
			"profile.email.error.inUse",
			"Email is already in use",
		);
		return { success: false, message, fieldErrors: { newEmail: message } };
	}

	const credentials = await db.query.UserCredentialsTable.findFirst({
		columns: { passwordHash: true, passwordSalt: true },
		where: eq(UserCredentialsTable.userId, currentUser.id),
	});

	if (credentials?.passwordHash) {
		if (!currentPassword) {
			const message = tr(
				"profile.email.error.passwordRequired",
				"Enter your current password",
			);
			return {
				success: false,
				message,
				fieldErrors: { currentPassword: message },
			};
		}

		const isValid = await comparePasswords({
			password: currentPassword,
			hashedPassword: credentials.passwordHash,
			salt: credentials.passwordSalt,
		});

		if (!isValid) {
			const message = tr(
				"profile.email.error.passwordIncorrect",
				"Current password is incorrect",
			);
			return {
				success: false,
				message,
				fieldErrors: { currentPassword: message },
			};
		}
	}

	const token = createTokenValue();
	const tokenHash = hashTokenValue(token);
	const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS);

	await db.transaction(async (trx) => {
		await trx
			.delete(UserTokensTable)
			.where(
				and(
					eq(UserTokensTable.userId, currentUser.id),
					eq(UserTokensTable.type, "email_verification"),
				),
			);

		await trx
			.insert(UserTokensTable)
			.values({
				userId: currentUser.id,
				tokenHash,
				type: "email_verification",
				expiresAt,
				metadata: {
					newEmail: newEmail,
					normalizedEmail: normalizedNewEmail,
					currentEmail: currentUser.email,
					operation: "change",
				},
			});
	});

	const origin = await resolveOrigin();

	if (!origin) {
		return {
			success: false,
			message: tr(
				"profile.email.error.missingOrigin",
				"Unable to determine application URL",
			),
		};
	}

	const verificationUrl = buildVerificationUrl(origin, token);

	try {
		await sendEmailChangeVerification({
			to: newEmail,
			name: currentUser.name,
			verificationUrl,
			currentEmail: currentUser.email,
		});
	} catch (error) {
		console.error("Failed to send email change verification", error);
		return {
			success: false,
			message: tr(
				"profile.email.error.sendFailed",
				"We couldn't send the verification email. Please try again.",
			),
		};
	}

	return {
		success: true,
		message: tr(
			"profile.email.success.changeRequested",
			"Check your new inbox for a verification link.",
		),
	};
}

export async function sendEmailVerification(): Promise<ActionResult> {
	const tr = await getTranslator();
	const currentUser = await getCurrentUser({
		redirectIfNotFound: true,
		withFullUser: true,
	});

	if (currentUser.emailVerifiedAt) {
		return {
			success: true,
			message: tr(
				"emailVerification.alreadyVerified",
				"Your email is already verified.",
			),
		};
	}

	const origin = await resolveOrigin();

	if (!origin) {
		return {
			success: false,
			message: tr(
				"emailVerification.error.missingOrigin",
				"Unable to determine application URL",
			),
		};
	}

	const token = createTokenValue();
	const tokenHash = hashTokenValue(token);
	const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS);

	await db.transaction(async (trx) => {
		await trx
			.delete(UserTokensTable)
			.where(
				and(
					eq(UserTokensTable.userId, currentUser.id),
					eq(UserTokensTable.type, "email_verification"),
				),
			);

		await trx
			.insert(UserTokensTable)
			.values({
				userId: currentUser.id,
				tokenHash,
				type: "email_verification",
				expiresAt,
				metadata: {
					operation: "verify",
					normalizedEmail: normalizeEmail(currentUser.email),
				},
			});
	});

	const verificationUrl = buildVerificationUrl(origin, token);

	try {
		await sendEmailVerificationEmail({
			to: currentUser.email,
			name: currentUser.name,
			verificationUrl,
		});
	} catch (error) {
		console.error("Failed to send email verification", error);
		return {
			success: false,
			message: tr(
				"emailVerification.error.sendFailed",
				"We couldn't send the verification email. Please try again.",
			),
		};
	}

	return {
		success: true,
		message: tr(
			"emailVerification.sent",
			"Check your inbox and follow the link to verify your email.",
		),
	};
}

async function completeEmailChange(
	record: EmailTokenRecord,
	metadata: EmailTokenMetadata,
	now: Date,
	tr: Translator,
): Promise<VerifyResult> {
	const newEmail =
		typeof metadata.newEmail === "string" ? metadata.newEmail : null;
	const normalizedEmail =
		typeof metadata.normalizedEmail === "string"
			? metadata.normalizedEmail
			: newEmail
				? normalizeEmail(newEmail)
				: null;

	if (!newEmail || !normalizedEmail) {
		return {
			status: "error",
			message: tr(
				"emailVerification.error.unableToVerify",
				"Unable to verify email change.",
			),
		};
	}

	const conflict = await db.query.UsersTable.findFirst({
		columns: { id: true },
		where: and(
			eq(UsersTable.emailNormalized, normalizedEmail),
			ne(UsersTable.id, record.userId),
		),
	});

	if (conflict) {
		return {
			status: "error",
			message: tr(
				"emailVerification.error.conflict",
				"This email is already associated with another account.",
			),
		};
	}

	try {
		await db.transaction(async (trx) => {
			await trx
				.update(UsersTable)
				.set({
					email: newEmail,
					emailNormalized: normalizedEmail,
					emailVerifiedAt: now,
				})
				.where(eq(UsersTable.id, record.userId));

			await trx
				.update(UserTokensTable)
				.set({ consumedAt: now })
				.where(eq(UserTokensTable.id, record.id));

			await trx
				.delete(UserTokensTable)
				.where(
					and(
						eq(UserTokensTable.userId, record.userId),
						eq(UserTokensTable.type, "email_verification"),
						ne(UserTokensTable.id, record.id),
					),
				);
		});
	} catch (error) {
		console.error("Failed to finalize email change verification", error);
		return {
			status: "error",
			message: tr(
				"emailVerification.error.unableToVerify",
				"Unable to verify email change.",
			),
		};
	}

	return {
		status: "success",
		message: tr(
			"emailVerification.success.changed",
			"Email updated successfully.",
		),
	};
}

async function completeEmailVerification(
	record: EmailTokenRecord,
	metadata: EmailTokenMetadata,
	now: Date,
	tr: Translator,
): Promise<VerifyResult> {
	const user = await db.query.UsersTable.findFirst({
		columns: { id: true, emailNormalized: true, status: true },
		where: eq(UsersTable.id, record.userId),
	});

	if (!user) {
		return {
			status: "error",
			message: tr(
				"emailVerification.error.generic",
				"We could not verify your email. Please request a new link.",
			),
		};
	}

	const normalizedEmail =
		typeof metadata.normalizedEmail === "string"
			? metadata.normalizedEmail
			: user.emailNormalized;

	if (normalizedEmail && normalizedEmail !== user.emailNormalized) {
		return {
			status: "error",
			message: tr(
				"emailVerification.error.invalidToken",
				"Invalid email verification link.",
			),
		};
	}

	const nextStatus = user.status === "invited" ? "active" : user.status;

	try {
		await db.transaction(async (trx) => {
			await trx
				.update(UsersTable)
				.set({ emailVerifiedAt: now, status: nextStatus })
				.where(eq(UsersTable.id, user.id));

			await trx
				.update(UserTokensTable)
				.set({ consumedAt: now })
				.where(eq(UserTokensTable.id, record.id));

			await trx
				.delete(UserTokensTable)
				.where(
					and(
						eq(UserTokensTable.userId, user.id),
						eq(UserTokensTable.type, "email_verification"),
						ne(UserTokensTable.id, record.id),
					),
				);
		});
	} catch (error) {
		console.error("Failed to finalize email verification", error);
		return {
			status: "error",
			message: tr(
				"emailVerification.error.generic",
				"We could not verify your email. Please request a new link.",
			),
		};
	}

	return {
		status: "success",
		message: tr(
			"emailVerification.success.verified",
			"Email verified successfully.",
		),
	};
}

export async function verifyEmailToken(token: string): Promise<VerifyResult> {
	const tr = await getTranslator();

	if (!token || token.length === 0) {
		return {
			status: "error",
			message: tr(
				"emailVerification.error.invalidToken",
				"Invalid email verification link.",
			),
		};
	}

	const tokenHash = hashTokenValue(token);
	const record = await db.query.UserTokensTable.findFirst({
		columns: {
			id: true,
			userId: true,
			expiresAt: true,
			consumedAt: true,
			metadata: true,
		},
		where: and(
			eq(UserTokensTable.tokenHash, tokenHash),
			eq(UserTokensTable.type, "email_verification"),
		),
	});

	if (!record) {
		return {
			status: "error",
			message: tr(
				"emailVerification.error.invalidToken",
				"Invalid email verification link.",
			),
		};
	}

	const now = new Date();

	if (record.consumedAt != null || record.expiresAt.getTime() <= now.getTime()) {
		return {
			status: "error",
			message: tr(
				"emailVerification.error.expired",
				"This verification link has expired.",
			),
		};
	}

	const metadata = (record.metadata ?? {}) as EmailTokenMetadata;
	const operation = metadata.operation === "change" ? "change" : "verify";

	if (operation === "change") {
		return completeEmailChange(record, metadata, now, tr);
	}

	return completeEmailVerification(record, metadata, now, tr);
}

export { verifyEmailToken as verifyEmailChange };
