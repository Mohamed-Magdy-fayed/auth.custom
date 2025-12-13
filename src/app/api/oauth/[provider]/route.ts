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
	OrganizationMembershipsTable,
	OrganizationsTable,
	oAuthProviderValues,
	RolesTable,
	TeamMembershipsTable,
	TeamsTable,
	UserOAuthAccountsTable,
	UserRoleAssignmentsTable,
	UsersTable,
} from "@/auth/tables";
import { db } from "@/drizzle/db";
import { slugify } from "@/lib/utils";

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

		await createSession({ id: user.id, role: user.role }, cookieJar);
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

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function ensureDefaultRole(trx: DbTransaction, key: string) {
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
		const existingUser = options.currentUserId
			? await trx.query.UsersTable.findFirst({
					columns: { id: true, emailVerifiedAt: true },
					where: eq(UsersTable.id, options.currentUserId),
					with: {
						roleAssignments: {
							columns: {},
							with: { role: { columns: { key: true } } },
						},
					},
				})
			: await trx.query.UsersTable.findFirst({
					columns: { id: true, emailVerifiedAt: true },
					where: eq(UsersTable.emailNormalized, normalizedEmail),
					with: {
						roleAssignments: {
							columns: {},
							with: { role: { columns: { key: true } } },
						},
					},
				});

		let user = existingUser;

		if (user == null) {
			const [newUser] = await trx
				.insert(UsersTable)
				.values({
					email,
					emailNormalized: normalizedEmail,
					displayName: name,
					status: "active",
					emailVerifiedAt: new Date(),
				})
				.returning({
					id: UsersTable.id,
					emailVerifiedAt: UsersTable.emailVerifiedAt,
				});

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

			await ensureDefaultOrganization(trx, { userId: newUser.id, name });

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

			if (user.emailVerifiedAt == null) {
				await trx
					.update(UsersTable)
					.set({ emailVerifiedAt: new Date() })
					.where(eq(UsersTable.id, user.id));
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

async function ensureDefaultOrganization(
	trx: DbTransaction,
	{ userId, name }: { userId: string; name: string },
) {
	const existingMembership =
		await trx.query.OrganizationMembershipsTable.findFirst({
			columns: { userId: true },
			where: eq(OrganizationMembershipsTable.userId, userId),
		});

	if (existingMembership) return;

	const organizationLabel = `${name || "New user"}'s Organization`;
	const organizationSlug = await generateUniqueOrganizationSlug(
		trx,
		organizationLabel,
	);

	const [organization] = await trx
		.insert(OrganizationsTable)
		.values({
			name: organizationLabel,
			slug: organizationSlug,
			description: null,
			createdById: userId,
		})
		.returning();

	if (!organization) {
		throw new Error("Failed to create organization for OAuth signup");
	}

	const teamLabel = `${name || "New user"}'s Team`;
	const teamSlug = await generateUniqueTeamSlug(trx, teamLabel);

	const [team] = await trx
		.insert(TeamsTable)
		.values({
			organizationId: organization.id,
			name: teamLabel,
			slug: teamSlug,
			description: null,
		})
		.returning();

	if (!team) {
		throw new Error("Failed to create team for OAuth signup");
	}

	const now = new Date();

	await trx
		.insert(OrganizationMembershipsTable)
		.values({
			organizationId: organization.id,
			userId,
			status: "active",
			isDefault: true,
			joinedAt: now,
		});

	await trx
		.insert(TeamMembershipsTable)
		.values({
			teamId: team.id,
			userId,
			status: "active",
			isManager: true,
			joinedAt: now,
		});
}

async function generateUniqueOrganizationSlug(
	trx: DbTransaction,
	name: string,
) {
	const base = slugify(name) || "organization";
	let candidate = base;
	let suffix = 1;

	while (
		await trx.query.OrganizationsTable.findFirst({
			columns: { id: true },
			where: eq(OrganizationsTable.slug, candidate),
		})
	) {
		candidate = `${base}-${suffix++}`;
	}

	return candidate;
}

async function generateUniqueTeamSlug(trx: DbTransaction, name: string) {
	const base = slugify(name) || "team";
	let candidate = base;
	let suffix = 1;

	while (
		await trx.query.TeamsTable.findFirst({
			columns: { id: true },
			where: eq(TeamsTable.slug, candidate),
		})
	) {
		candidate = `${base}-${suffix++}`;
	}

	return candidate;
}
