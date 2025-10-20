import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { z } from "zod";
import { DEFAULT_ROLE_KEY } from "@/auth/core/constants";
import { getOAuthClient } from "@/auth/core/oauth/base";
import { createSession, getSessionFromCookie } from "@/auth/core/session";
import {
	OAuthProvider,
	oAuthProviderValues,
	RolesTable,
	UserOAuthAccountsTable,
	UserRoleAssignmentsTable,
	UsersTable,
} from "@/auth/tables";
import { db } from "@/drizzle/db";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ provider: string }> },
) {
	const { provider: rawProvider } = await params;
	const code = request.nextUrl.searchParams.get("code");
	const state = request.nextUrl.searchParams.get("state");
	const provider = z.enum(oAuthProviderValues).parse(rawProvider);

	if (typeof code !== "string" || typeof state !== "string") {
		redirect(
			`/sign-in?oauthError=${encodeURIComponent(
				"Failed to connect. Please try again.",
			)}`,
		);
	}

	const cookieJar = await cookies();
	const currentSession = await getSessionFromCookie(cookieJar);
	const oAuthClient = getOAuthClient(provider);
	try {
		const oAuthUser = await oAuthClient.fetchUser(code, state, cookieJar);

		let user: { id: string; role: string } | null = null;

		if (currentSession?.id) {
			user = await connectUserToAccount(oAuthUser, provider, {
				currentUserId: currentSession.id,
			});
		} else {
			const existingUser = await db.query.UserOAuthAccountsTable.findFirst({
				where: eq(UserOAuthAccountsTable.providerAccountId, oAuthUser.id),
			});

			user = await connectUserToAccount(oAuthUser, provider, {
				currentUserId: existingUser?.userId,
			});
		}

		await createSession(
			{ id: user.id, role: user.role, sessionId: currentSession?.sessionId },
			cookieJar,
			{
				userAgent: request.headers.get("user-agent") ?? undefined,
				ipAddress:
					request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
			},
		);
	} catch (error: any) {
		console.error(error);
		redirect(
			`/sign-in?oauthError=${encodeURIComponent(
				error.message || "Failed to connect. Please try again.",
			)}`,
		);
	}

	redirect("/app");
}

async function ensureDefaultRole(trx: any, key: string) {
	let defaultRole = await trx.query.RolesTable.findFirst({
		columns: { id: true, key: true },
		where: and(eq(RolesTable.key, key), isNull(RolesTable.organizationId)),
	});

	if (defaultRole == null) {
		[defaultRole] = await trx
			.insert(RolesTable)
			.values({ key, name: key === DEFAULT_ROLE_KEY ? "User" : key })
			.returning({ id: RolesTable.id, key: RolesTable.key });
	}

	if (defaultRole == null) {
		throw new Error("Failed to ensure default role");
	}

	return defaultRole;
}

function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

type ConnectOptions = { currentUserId?: string };

function connectUserToAccount(
	{ id, email, name }: { id: string; email: string; name: string },
	provider: OAuthProvider,
	options: ConnectOptions = {},
) {
	return db.transaction(async (trx) => {
		const normalizedEmail = normalizeEmail(email);
		let user = options.currentUserId
			? await trx.query.UsersTable.findFirst({
				columns: { id: true },
				where: eq(UsersTable.id, options.currentUserId),
				with: {
					roleAssignments: {
						columns: {},
						with: { role: { columns: { key: true } } },
					},
				},
			})
			: await trx.query.UsersTable.findFirst({
				columns: { id: true },
				where: eq(UsersTable.emailNormalized, normalizedEmail),
				with: {
					roleAssignments: {
						columns: {},
						with: { role: { columns: { key: true } } },
					},
				},
			});

		if (user == null) {
			const [newUser] = await trx
				.insert(UsersTable)
				.values({
					email,
					emailNormalized: normalizedEmail,
					displayName: name,
					status: "active",
				})
				.returning({ id: UsersTable.id });

			if (newUser == null) {
				throw new Error("Unable to create user from OAuth profile");
			}

			const defaultRole = await ensureDefaultRole(trx, DEFAULT_ROLE_KEY);

			await trx
				.insert(UserRoleAssignmentsTable)
				.values({
					userId: newUser.id,
					roleId: defaultRole.id,
					assignedById: newUser.id,
				});

			user = { ...newUser, roleAssignments: [{ role: { key: defaultRole.key } }] };
		} else {
			const existingAccount = await trx.query.UserOAuthAccountsTable.findFirst({
				columns: { userId: true },
				where: and(
					eq(UserOAuthAccountsTable.provider, provider),
					eq(UserOAuthAccountsTable.providerAccountId, id),
				),
			});

			if (existingAccount && existingAccount.userId !== user.id) {
				throw new Error("This OAuth account is already linked to another user");
			}
		}

		await trx
			.insert(UserOAuthAccountsTable)
			.values({ provider, providerAccountId: id, userId: user.id })
			.onConflictDoNothing();

		const roleKey =
			user.roleAssignments?.find((assignment) => assignment.role != null)?.role
				?.key ?? DEFAULT_ROLE_KEY;

		return { id: user.id, role: roleKey };
	});
}
