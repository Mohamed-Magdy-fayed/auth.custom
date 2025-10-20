"use server";

import { randomInt } from "crypto";
import { and, eq } from "drizzle-orm";

import { authMessage, isFeatureEnabled } from "@/auth/config";
import { generateSalt, hashPassword } from "@/auth/core/passwordHasher";
import { hashTokenValue } from "@/auth/core/token";
import {
	SessionsTable,
	UserCredentialsTable,
	UsersTable,
	UserTokensTable,
} from "@/auth/tables";
import { db } from "@/drizzle/db";
import { sendPasswordResetCodeEmail } from "../emails/passwordReset";
import {
	passwordResetRequestSchema,
	passwordResetSubmissionSchema,
} from "./schemas";

const PASSWORD_RESET_OTP_LENGTH = 6;
const PASSWORD_RESET_OTP_TTL_MS = 1000 * 60 * 10; // 10 minutes

function ensurePasswordFeatureEnabled(): PasswordResetResult | null {
	if (isFeatureEnabled("password")) {
		return null;
	}

	return {
		status: "error",
		message: authMessage(
			"password.featureDisabled",
			"Password-based authentication is disabled.",
		),
	};
}

function generateResetOtp() {
	return randomInt(0, 10 ** PASSWORD_RESET_OTP_LENGTH)
		.toString()
		.padStart(PASSWORD_RESET_OTP_LENGTH, "0");
}

function hashPasswordResetOtp(normalizedEmail: string, otp: string) {
	return hashTokenValue(`${normalizedEmail}:${otp}`);
}

function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

type PasswordResetResult = { status: "success" | "error"; message: string };

export async function requestPasswordReset(
	unsafeData: unknown,
): Promise<PasswordResetResult> {
	const featureError = ensurePasswordFeatureEnabled();
	if (featureError) {
		return featureError;
	}

	const parsed = passwordResetRequestSchema.safeParse(unsafeData);

	if (!parsed.success) {
		return {
			status: "error",
			message:
				parsed.error.issues[0]?.message ??
				authMessage(
					"passwordReset.request.invalidEmail",
					"Enter a valid email address",
				),
		};
	}

	const { email } = parsed.data;
	const normalizedEmail = normalizeEmail(email);

	const user = await db.query.UsersTable.findFirst({
		columns: { id: true, email: true, displayName: true },
		where: eq(UsersTable.emailNormalized, normalizedEmail),
	});

	if (!user) {
		// Avoid account enumeration: respond as success
		return {
			status: "success",
			message: authMessage(
				"passwordReset.request.success",
				"If that email exists, we just sent a reset code.",
			),
		};
	}

	const otp = generateResetOtp();
	const tokenHash = hashPasswordResetOtp(normalizedEmail, otp);
	const expiresAt = new Date(Date.now() + PASSWORD_RESET_OTP_TTL_MS);

	await db.transaction(async (trx) => {
		await trx
			.delete(UserTokensTable)
			.where(
				and(
					eq(UserTokensTable.userId, user.id),
					eq(UserTokensTable.type, "password_reset"),
				),
			);

		await trx
			.insert(UserTokensTable)
			.values({
				userId: user.id,
				tokenHash,
				type: "password_reset",
				expiresAt,
				metadata: {
					email: user.email,
					normalizedEmail,
					otpLength: PASSWORD_RESET_OTP_LENGTH,
				},
			});
	});

	try {
		await sendPasswordResetCodeEmail({
			to: user.email,
			name: user.displayName,
			code: otp,
			expiresInMinutes: Math.floor(PASSWORD_RESET_OTP_TTL_MS / (1000 * 60)),
		});
	} catch (error) {
		console.error("Failed to send password reset code email", error);

		await db
			.delete(UserTokensTable)
			.where(eq(UserTokensTable.tokenHash, tokenHash));

		return {
			status: "error",
			message: authMessage(
				"passwordReset.request.emailError",
				"We couldn't send the reset email. Please try again shortly.",
			),
		};
	}

	return {
		status: "success",
		message: authMessage(
			"passwordReset.request.success",
			"If that email exists, we just sent a reset code.",
		),
	};
}

export async function resetPassword(
	unsafeData: unknown,
): Promise<PasswordResetResult> {
	const featureError = ensurePasswordFeatureEnabled();
	if (featureError) {
		return featureError;
	}

	const parsed = passwordResetSubmissionSchema.safeParse(unsafeData);

	if (!parsed.success) {
		return {
			status: "error",
			message:
				parsed.error.issues[0]?.message ??
				authMessage("passwordReset.reset.error", "Unable to reset password"),
		};
	}

	const { email, password, otp } = parsed.data;
	const normalizedEmail = normalizeEmail(email);
	const tokenHash = hashPasswordResetOtp(normalizedEmail, otp);
	const now = new Date();

	const tokenRecord = await db.query.UserTokensTable.findFirst({
		columns: {
			id: true,
			userId: true,
			expiresAt: true,
			consumedAt: true,
			metadata: true,
		},
		where: and(
			eq(UserTokensTable.tokenHash, tokenHash),
			eq(UserTokensTable.type, "password_reset"),
		),
	});

	if (
		!tokenRecord ||
		tokenRecord.consumedAt != null ||
		tokenRecord.expiresAt.getTime() <= now.getTime()
	) {
		return {
			status: "error",
			message: authMessage(
				"passwordReset.reset.invalidCode",
				"The verification code is invalid or has expired.",
			),
		};
	}

	const metadata = (tokenRecord.metadata ?? {}) as { normalizedEmail?: unknown };
	const tokenEmail =
		typeof metadata.normalizedEmail === "string"
			? metadata.normalizedEmail
			: null;

	if (tokenEmail && tokenEmail !== normalizedEmail) {
		return {
			status: "error",
			message: authMessage(
				"passwordReset.reset.invalidCode",
				"The verification code is invalid or has expired.",
			),
		};
	}

	const user = await db.query.UsersTable.findFirst({
		columns: { id: true, emailNormalized: true },
		where: eq(UsersTable.id, tokenRecord.userId),
	});

	if (!user || user.emailNormalized !== normalizedEmail) {
		return {
			status: "error",
			message: authMessage(
				"passwordReset.reset.invalidCode",
				"The verification code is invalid or has expired.",
			),
		};
	}

	const salt = generateSalt();
	const passwordHash = await hashPassword(password, salt);

	try {
		await db.transaction(async (trx) => {
			const credentials = await trx.query.UserCredentialsTable.findFirst({
				columns: { userId: true },
				where: eq(UserCredentialsTable.userId, user.id),
			});

			if (credentials) {
				await trx
					.update(UserCredentialsTable)
					.set({ passwordHash, passwordSalt: salt })
					.where(eq(UserCredentialsTable.userId, user.id));
			} else {
				await trx
					.insert(UserCredentialsTable)
					.values({ userId: user.id, passwordHash, passwordSalt: salt });
			}

			await trx
				.update(UserTokensTable)
				.set({ consumedAt: now })
				.where(eq(UserTokensTable.id, tokenRecord.id));

			await trx
				.update(SessionsTable)
				.set({ status: "revoked", revokedAt: now, revokedBy: user.id })
				.where(eq(SessionsTable.userId, user.id));
		});
	} catch (error) {
		console.error(error);
		return {
			status: "error",
			message: authMessage(
				"passwordReset.reset.error",
				"Unable to reset password",
			),
		};
	}

	return {
		status: "success",
		message: authMessage(
			"passwordReset.reset.success",
			"Password updated. You can sign in with your new password.",
		),
	};
}
