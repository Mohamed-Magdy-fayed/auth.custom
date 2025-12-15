"use server";

import { and, eq, ne } from "drizzle-orm";
import { headers } from "next/headers";
import { type ZodError, z } from "zod";
import { comparePasswords } from "@/auth/core/passwordHasher";
import { createTokenValue, hashTokenValue } from "@/auth/core/token";
import { UserCredentialsTable } from "@/auth/tables/user-credentials-table";
import { UserTokensTable } from "@/auth/tables/user-tokens-table";
import { UsersTable } from "@/auth/tables/users-table";
import { db } from "@/drizzle/db";
import { getT } from "@/lib/i18n/actions";
import { getCurrentUser } from "./currentUser";
import { sendEmailChangeVerification } from "./emails/emailChangeVerification";
import { sendEmailVerificationEmail } from "./emails/emailVerification";
import { type ChangeEmailInput, changeEmailSchema } from "./profileSchemas";

const EMAIL_VERIFICATION_TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

type TFunction = Awaited<ReturnType<typeof getT>>["t"];

type ActionResult = {
	success: boolean;
	message: string;
	fieldErrors?: Record<string, string>;
};

type VerifyResult = { status: "success" | "error"; message: string };

type EmailTokenMetadata = {
	operation?: unknown;
	newEmail?: unknown;
	normalizedEmail?: unknown;
	currentEmail?: unknown;
};

type EmailTokenRecord = { id: string; userId: string };

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

function validationError(error: ZodError, t: TFunction): ActionResult {
	const flat = z.treeifyError(error);
	const fieldErrors = Object.fromEntries(
		Object.entries(flat.errors)
			.filter(([, value]) => Array.isArray(value) && value.length > 0)
			.map(([key, value]) => [key, value as string]),
	) as Record<string, string>;

	return {
		success: false,
		message: t("authTranslations.profile.error.invalidInput"),
		fieldErrors,
	};
}

export async function requestEmailChange(
	unsafeData: ChangeEmailInput,
): Promise<ActionResult> {
	const { t } = await getT();
	const currentUser = await getCurrentUser({
		redirectIfNotFound: true,
		withFullUser: true,
	});
	const parsed = changeEmailSchema.safeParse(unsafeData);

	if (!parsed.success) {
		return validationError(parsed.error, t);
	}

	const { newEmail, currentPassword } = parsed.data;
	const normalizedNewEmail = normalizeEmail(newEmail);
	const normalizedCurrentEmail = normalizeEmail(currentUser.email);

	if (normalizedNewEmail === normalizedCurrentEmail) {
		const message = t("authTranslations.profile.email.error.sameAddress");
		return { success: false, message, fieldErrors: { newEmail: message } };
	}

	const existingUser = await db.query.UsersTable.findFirst({
		columns: { id: true },
		where: eq(UsersTable.emailNormalized, normalizedNewEmail),
	});

	if (existingUser) {
		const message = t("authTranslations.profile.email.error.inUse");
		return { success: false, message, fieldErrors: { newEmail: message } };
	}

	const credentials = await db.query.UserCredentialsTable.findFirst({
		columns: { passwordHash: true, passwordSalt: true },
		where: eq(UserCredentialsTable.userId, currentUser.id),
	});

	if (credentials?.passwordHash) {
		if (!currentPassword) {
			const message = t("authTranslations.profile.email.error.passwordRequired");
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
			const message = t("authTranslations.profile.email.error.passwordIncorrect");
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
		return { success: false, message: t("authTranslations.profile.email.error.missingOrigin") };
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
		return { success: false, message: t("authTranslations.profile.email.error.sendFailed") };
	}

	return { success: true, message: t("authTranslations.profile.email.success.changeRequested") };
}

export async function sendEmailVerification(): Promise<ActionResult> {
	const { t } = await getT();
	const currentUser = await getCurrentUser({
		redirectIfNotFound: true,
		withFullUser: true,
	});

	if (currentUser.emailVerifiedAt) {
		return { success: true, message: t("authTranslations.emailVerification.alreadyVerified") };
	}

	const origin = await resolveOrigin();

	if (!origin) {
		return {
			success: false,
			message: t("authTranslations.emailVerification.error.missingOrigin"),
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
		return { success: false, message: t("authTranslations.emailVerification.error.sendFailed") };
	}

	return { success: true, message: t("authTranslations.emailVerification.sent") };
}

async function completeEmailChange(
	record: EmailTokenRecord,
	metadata: EmailTokenMetadata,
	now: Date,
	t: TFunction,
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
			message: t("authTranslations.emailVerification.error.unableToVerify"),
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
		return { status: "error", message: t("authTranslations.emailVerification.error.conflict") };
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
			message: t("authTranslations.emailVerification.error.unableToVerify"),
		};
	}

	return { status: "success", message: t("authTranslations.emailVerification.success.changed") };
}

async function completeEmailVerification(
	record: EmailTokenRecord,
	metadata: EmailTokenMetadata,
	now: Date,
	t: TFunction,
): Promise<VerifyResult> {
	const user = await db.query.UsersTable.findFirst({
		columns: { id: true, emailNormalized: true, status: true },
		where: eq(UsersTable.id, record.userId),
	});

	if (!user) {
		return { status: "error", message: t("authTranslations.emailVerification.error.generic") };
	}

	const normalizedEmail =
		typeof metadata.normalizedEmail === "string"
			? metadata.normalizedEmail
			: user.emailNormalized;

	if (normalizedEmail && normalizedEmail !== user.emailNormalized) {
		return {
			status: "error",
			message: t("authTranslations.emailVerification.error.invalidToken"),
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
		return { status: "error", message: t("authTranslations.emailVerification.error.generic") };
	}

	return { status: "success", message: t("authTranslations.emailVerification.success.verified") };
}

export async function verifyEmailToken(token: string): Promise<VerifyResult> {
	const { t } = await getT();

	if (!token || token.length === 0) {
		return {
			status: "error",
			message: t("authTranslations.emailVerification.error.invalidToken"),
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
			message: t("authTranslations.emailVerification.error.invalidToken"),
		};
	}

	const now = new Date();

	if (record.consumedAt != null || record.expiresAt.getTime() <= now.getTime()) {
		return { status: "error", message: t("authTranslations.emailVerification.error.expired") };
	}

	const metadata = (record.metadata ?? {}) as EmailTokenMetadata;
	const operation = metadata.operation === "change" ? "change" : "verify";

	if (operation === "change") {
		return completeEmailChange(record, metadata, now, t);
	}

	return completeEmailVerification(record, metadata, now, t);
}

export { verifyEmailToken as verifyEmailChange };
