"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { type ZodError, z } from "zod";
import {
	comparePasswords,
	generateSalt,
	hashPassword,
} from "@/auth/core/passwordHasher";
import { createSession } from "@/auth/core/session";
import { UserCredentialsTable } from "@/auth/tables/user-credentials-table";
import { UsersTable } from "@/auth/tables/users-table";
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

	await db
		.update(UserCredentialsTable)
		.set({
			passwordHash,
			passwordSalt: salt,
			mustChangePassword: false,
			lastChangedAt: now,
		})
		.where(eq(UserCredentialsTable.userId, currentUser.id));

	await createSession(
		{ id: currentUser.id, role: currentUser.role },
		await cookies(),
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

	await db
		.insert(UserCredentialsTable)
		.values({
			userId: currentUser.id,
			passwordHash,
			passwordSalt: salt,
			mustChangePassword: false,
			lastChangedAt: now,
		});

	await createSession(
		{ id: currentUser.id, role: currentUser.role },
		await cookies(),
	);

	revalidatePath("/");

	return { success: true, message: "Password created" };
}
