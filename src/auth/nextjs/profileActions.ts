"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { type ZodError, z } from "zod";
import {
	comparePasswords,
	generateSalt,
	hashPassword,
} from "@/auth/core/passwordHasher";
import { createSession } from "@/auth/core/session";
import { SessionsTable, UserCredentialsTable, UsersTable } from "@/auth/tables";
import { db } from "@/drizzle/db";

import { getCurrentUser } from "./currentUser";
import {
	type ChangePasswordInput,
	CreatePasswordInput,
	changePasswordSchema,
	createPasswordSchema,
	type UpdateProfileInput,
	updateProfileSchema,
} from "./profileSchemas";
import { getSessionContext } from "./sessionContext";

type ActionResult = {
	success: boolean;
	message?: string;
	fieldErrors?: Record<string, string>;
};

function validationError(error: ZodError): ActionResult {
	const flat = z.treeifyError(error);
	const fieldErrors = Object.fromEntries(
		Object.entries(flat.errors)
			.filter(([, value]) => Array.isArray(value) && value.length > 0)
			.map(([key, value]) => [key, value as string]),
	) as Record<string, string>;

	return { success: false, message: "Invalid input", fieldErrors };
}

export async function updateProfile(
	unsafeData: UpdateProfileInput,
): Promise<ActionResult> {
	const currentUser = await getCurrentUser({ redirectIfNotFound: true });
	const parsed = updateProfileSchema.safeParse(unsafeData);

	if (!parsed.success) {
		return validationError(parsed.error);
	}

	await db
		.update(UsersTable)
		.set({ name: parsed.data.name })
		.where(eq(UsersTable.id, currentUser.id));

	revalidatePath("/");
	revalidatePath("/");

	return { success: true, message: "Profile updated" };
}

export async function changePassword(
	unsafeData: ChangePasswordInput,
): Promise<ActionResult> {
	const currentUser = await getCurrentUser({ redirectIfNotFound: true });
	const parsed = changePasswordSchema.safeParse(unsafeData);

	if (!parsed.success) {
		return validationError(parsed.error);
	}

	const credentials = await db.query.UserCredentialsTable.findFirst({
		columns: { passwordHash: true, passwordSalt: true },
		where: eq(UserCredentialsTable.userId, currentUser.id),
	});

	if (!credentials) {
		return { success: false, message: "Password is not set for this account" };
	}

	const isValid = await comparePasswords({
		password: parsed.data.currentPassword,
		hashedPassword: credentials.passwordHash,
		salt: credentials.passwordSalt,
	});

	if (!isValid) {
		return { success: false, message: "Current password is incorrect" };
	}

	const salt = generateSalt();
	const passwordHash = await hashPassword(parsed.data.newPassword, salt);
	const now = new Date();

	await db.transaction(async (trx) => {
		await trx
			.update(UserCredentialsTable)
			.set({
				passwordHash,
				passwordSalt: salt,
				mustChangePassword: false,
				lastChangedAt: now,
			})
			.where(eq(UserCredentialsTable.userId, currentUser.id));

		if (currentUser.sessionId) {
			await trx
				.update(SessionsTable)
				.set({ status: "revoked", revokedAt: now, revokedBy: currentUser.id })
				.where(
					and(
						eq(SessionsTable.userId, currentUser.id),
						ne(SessionsTable.id, currentUser.sessionId),
					),
				);
		} else {
			await trx
				.update(SessionsTable)
				.set({ status: "revoked", revokedAt: now, revokedBy: currentUser.id })
				.where(eq(SessionsTable.userId, currentUser.id));
		}
	});

	await createSession(
		{
			id: currentUser.id,
			role: currentUser.role,
			sessionId: currentUser.sessionId,
		},
		await cookies(),
		await getSessionContext(),
	);

	revalidatePath("/");

	return { success: true, message: "Password updated" };
}

export async function createPassword(
	unsafeData: CreatePasswordInput,
): Promise<ActionResult> {
	const currentUser = await getCurrentUser({ redirectIfNotFound: true });
	const parsed = createPasswordSchema.safeParse(unsafeData);

	if (!parsed.success) {
		return validationError(parsed.error);
	}

	const credentials = await db.query.UserCredentialsTable.findFirst({
		columns: { passwordHash: true, passwordSalt: true },
		where: eq(UserCredentialsTable.userId, currentUser.id),
	});

	if (credentials) {
		return {
			success: false,
			message: "Password is already setup for this account",
		};
	}

	const salt = generateSalt();
	const passwordHash = await hashPassword(parsed.data.newPassword, salt);
	const now = new Date();

	await db.transaction(async (trx) => {
		await trx
			.insert(UserCredentialsTable)
			.values({
				userId: currentUser.id,
				passwordHash,
				passwordSalt: salt,
				mustChangePassword: false,
				lastChangedAt: now,
			});

		if (currentUser.sessionId) {
			await trx
				.update(SessionsTable)
				.set({ status: "revoked", revokedAt: now, revokedBy: currentUser.id })
				.where(
					and(
						eq(SessionsTable.userId, currentUser.id),
						ne(SessionsTable.id, currentUser.sessionId),
					),
				);
		} else {
			await trx
				.update(SessionsTable)
				.set({ status: "revoked", revokedAt: now, revokedBy: currentUser.id })
				.where(eq(SessionsTable.userId, currentUser.id));
		}
	});

	await createSession(
		{
			id: currentUser.id,
			role: currentUser.role,
			sessionId: currentUser.sessionId,
		},
		await cookies(),
		await getSessionContext(),
	);

	revalidatePath("/");

	return { success: true, message: "Password created" };
}
