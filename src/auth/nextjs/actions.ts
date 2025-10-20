"use server";

import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authMessage } from "@/auth/config";
import { OWNER_ROLE_KEY } from "@/auth/nextjs/org/permissions";
import {
	OAuthProvider,
	OrganizationMembershipsTable,
	OrganizationsTable,
	oAuthProviderValues,
	RolesTable,
	TeamMembershipsTable,
	TeamsTable,
	UserCredentialsTable,
	UserRoleAssignmentsTable,
	UsersTable,
} from "@/auth/tables";
import { db } from "@/drizzle/db";
import { slugify } from "@/lib/utils";
import { getUserWithTeam, logActivity } from "@/saas/db/queries";
import { createCheckoutSession } from "@/saas/payments/stripe";
import { InvitationsTable } from "@/saas/tables";
import { ActivityType } from "@/saas/tables/activity-logs-table";
import { DEFAULT_ROLE_KEY } from "../core/constants";
import { getOAuthClient } from "../core/oauth/base";
import {
	isOAuthProviderConfigured,
	providerDisplayNames,
} from "../core/oauth/providers";
import {
	comparePasswords,
	generateSalt,
	hashPassword,
} from "../core/passwordHasher";
import {
	createSession,
	getSessionFromCookie,
	removeSession,
} from "../core/session";
import { signInSchema, signUpSchema } from "./schemas";
import { getSessionContext } from "./sessionContext";

function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

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

export async function signIn(unsafeData: z.infer<typeof signInSchema>) {
	const { success, data } = signInSchema.safeParse(unsafeData);

	if (!success)
		return authMessage("auth.signIn.error.generic", "Unable to log you in");

	const normalizedEmail = normalizeEmail(data.email);

	const user = await db.query.UsersTable.findFirst({
		columns: { id: true, email: true, status: true },
		where: eq(UsersTable.emailNormalized, normalizedEmail),
		with: {
			credentials: { columns: { passwordHash: true, passwordSalt: true } },
			roleAssignments: { columns: {}, with: { role: { columns: { key: true } } } },
		},
	});

	if (
		user == null ||
		user.credentials == null ||
		user.credentials.passwordHash == null ||
		user.credentials.passwordSalt == null
	) {
		return authMessage("auth.signIn.error.generic", "Unable to log you in");
	}

	if (user.status !== "active") {
		return authMessage("auth.signIn.error.inactive", "Account is not active");
	}

	const isCorrectPassword = await comparePasswords({
		hashedPassword: user.credentials.passwordHash,
		password: data.password,
		salt: user.credentials.passwordSalt,
	});

	if (!isCorrectPassword)
		return authMessage("auth.signIn.error.generic", "Unable to log you in");

	const primaryRole =
		user.roleAssignments?.find((assignment) => assignment.role != null)?.role
			?.key ?? DEFAULT_ROLE_KEY;

	const sessionCookies = await cookies();
	const sessionContext = await getSessionContext();

	await createSession(
		{ id: user.id, role: primaryRole },
		sessionCookies,
		sessionContext,
	);

	const teamContext = await getUserWithTeam(user.id);
	await logActivity(
		teamContext?.teamId ?? null,
		user.id,
		ActivityType.SIGN_IN,
		sessionContext.ipAddress,
	);

	if (data.redirect === "checkout" && data.priceId) {
		await createCheckoutSession({
			team: teamContext?.team ?? null,
			priceId: data.priceId,
		});
		return;
	}

	if (data.redirect && data.redirect !== "checkout") {
		redirect(data.redirect);
	}

	redirect("/dashboard");
}

export async function signUp(unsafeData: z.infer<typeof signUpSchema>) {
	const result = signUpSchema.safeParse(unsafeData);

	if (!result.success) {
		console.warn("signUp validation failed", result.error.flatten());
		return (
			result.error.issues[0]?.message ??
			authMessage("auth.signUp.error.generic", "Unable to create account")
		);
	}

	const data = result.data;
	const normalizedEmail = normalizeEmail(data.email);
	const duplicateMessage = authMessage(
		"auth.signUp.error.duplicate",
		"Account already exists for this email",
	);
	const invalidInvitationMessage = authMessage(
		"auth.signUp.error.invalidInvite",
		"Invalid or expired invitation",
	);

	const sessionCookies = await cookies();
	const sessionContext = await getSessionContext();
	const now = new Date();

	type SignUpProvisionResult = {
		sessionUser: { id: string; role: string };
		team: typeof TeamsTable.$inferSelect | null;
		acceptedInvitation: boolean;
	};

	try {
		const signUpResult = await db.transaction<SignUpProvisionResult>(
			async (trx) => {
				const existingUser = await trx.query.UsersTable.findFirst({
					columns: { id: true },
					where: eq(UsersTable.emailNormalized, normalizedEmail),
				});

				if (existingUser != null) {
					throw new Error(duplicateMessage);
				}

				const salt = generateSalt();
				const passwordHash = await hashPassword(data.password, salt);

				const [createdUser] = await trx
					.insert(UsersTable)
					.values({
						displayName: data.name,
						email: data.email,
						emailNormalized: normalizedEmail,
						status: "active",
					})
					.returning();

				if (!createdUser) {
					throw new Error("Failed to create user");
				}

				await trx
					.insert(UserCredentialsTable)
					.values({ userId: createdUser.id, passwordHash, passwordSalt: salt });

				let defaultRole = await trx.query.RolesTable.findFirst({
					columns: { id: true },
					where: and(
						eq(RolesTable.key, DEFAULT_ROLE_KEY),
						isNull(RolesTable.organizationId),
					),
				});

				if (!defaultRole) {
					[defaultRole] = await trx
						.insert(RolesTable)
						.values({
							key: DEFAULT_ROLE_KEY,
							name: "User",
							description: "Default system role",
						})
						.returning({ id: RolesTable.id });
				}

				if (!defaultRole) {
					throw new Error("Failed to ensure default role");
				}

				await trx
					.insert(UserRoleAssignmentsTable)
					.values({
						userId: createdUser.id,
						roleId: defaultRole.id,
						assignedById: createdUser.id,
					});

				if (data.inviteToken) {
					const invitation = await trx.query.InvitationsTable.findFirst({
						where: eq(InvitationsTable.token, data.inviteToken),
					});

					if (
						!invitation ||
						invitation.status !== "pending" ||
						normalizeEmail(invitation.email) !== normalizedEmail
					) {
						throw new Error(invalidInvitationMessage);
					}

					const team = await trx.query.TeamsTable.findFirst({
						where: eq(TeamsTable.id, invitation.teamId),
					});

					if (!team) {
						throw new Error(invalidInvitationMessage);
					}

					const organizationMembershipValues = {
						organizationId: team.organizationId,
						userId: createdUser.id,
						status: "active" as const,
						isDefault: true,
						joinedAt: now,
					};

					await trx
						.insert(OrganizationMembershipsTable)
						.values(organizationMembershipValues)
						.onConflictDoNothing();

					let roleId: string | null = null;
					if (invitation.roleKey) {
						const role = await trx.query.RolesTable.findFirst({
							columns: { id: true },
							where: and(
								eq(RolesTable.organizationId, team.organizationId),
								eq(RolesTable.key, invitation.roleKey),
							),
						});
						roleId = role?.id ?? null;
					}

					await trx
						.insert(TeamMembershipsTable)
						.values({
							teamId: team.id,
							userId: createdUser.id,
							roleId,
							status: "active",
							isManager: invitation.roleKey === OWNER_ROLE_KEY,
							joinedAt: now,
						})
						.onConflictDoNothing();

					await trx
						.update(InvitationsTable)
						.set({ status: "accepted", acceptedAt: now })
						.where(eq(InvitationsTable.id, invitation.id));

					return {
						sessionUser: { id: createdUser.id, role: DEFAULT_ROLE_KEY },
						team,
						acceptedInvitation: true,
					};
				}

				const organizationName = `${data.name}'s Organization`;
				const organizationSlug = await generateUniqueOrganizationSlug(
					trx,
					organizationName,
				);

				const [organization] = await trx
					.insert(OrganizationsTable)
					.values({
						name: organizationName,
						slug: organizationSlug,
						description: null,
						createdById: createdUser.id,
					})
					.returning();

				if (!organization) {
					throw new Error("Failed to create organization");
				}

				const teamName = `${data.name}'s Team`;
				const teamSlug = await generateUniqueTeamSlug(trx, teamName);

				const [team] = await trx
					.insert(TeamsTable)
					.values({
						organizationId: organization.id,
						name: teamName,
						slug: teamSlug,
						description: null,
					})
					.returning();

				if (!team) {
					throw new Error("Failed to create team");
				}

				await trx
					.insert(OrganizationMembershipsTable)
					.values({
						organizationId: organization.id,
						userId: createdUser.id,
						status: "active",
						isDefault: true,
						joinedAt: now,
					});

				await trx
					.insert(TeamMembershipsTable)
					.values({
						teamId: team.id,
						userId: createdUser.id,
						status: "active",
						isManager: true,
						joinedAt: now,
					});

				return {
					sessionUser: { id: createdUser.id, role: DEFAULT_ROLE_KEY },
					team,
					acceptedInvitation: false,
				};
			},
		);

		await createSession(signUpResult.sessionUser, sessionCookies, sessionContext);

		const teamId = signUpResult.team?.id ?? null;
		if (teamId) {
			await logActivity(
				teamId,
				signUpResult.sessionUser.id,
				ActivityType.SIGN_UP,
				sessionContext.ipAddress,
			);
			await logActivity(
				teamId,
				signUpResult.sessionUser.id,
				signUpResult.acceptedInvitation
					? ActivityType.ACCEPT_INVITATION
					: ActivityType.CREATE_TEAM,
				sessionContext.ipAddress,
			);
		}

		if (data.redirect === "checkout" && data.priceId) {
			await createCheckoutSession({
				team: signUpResult.team,
				priceId: data.priceId,
			});
			return;
		}

		redirect("/dashboard");
	} catch (error: any) {
		if (error?.message === duplicateMessage) {
			return duplicateMessage;
		}

		if (error?.message === invalidInvitationMessage) {
			return invalidInvitationMessage;
		}

		console.error(error);
		return authMessage("auth.signUp.error.generic", "Unable to create account");
	}
}

export async function logOut() {
	const cookieStore = await cookies();
	const session = await getSessionFromCookie(cookieStore);

	if (session) {
		const teamContext = await getUserWithTeam(session.id);
		await logActivity(
			teamContext?.teamId ?? null,
			session.id,
			ActivityType.SIGN_OUT,
		);
	}

	await removeSession({
		delete: (val) => cookieStore.delete(val),
		get: (val) => cookieStore.get(val),
	});

	redirect("/sign-in");
}

export async function oAuthSignIn(provider: OAuthProvider) {
	if (!oAuthProviderValues.includes(provider)) {
		throw new Error("Unsupported OAuth provider");
	}

	if (!isOAuthProviderConfigured(provider)) {
		return {
			error: authMessage(
				"auth.oauth.providerUnavailable",
				`${providerDisplayNames[provider]} sign-in is not currently available.`,
			),
		};
	}

	const oAuthClient = getOAuthClient(provider);
	redirect(oAuthClient.createAuthUrl(await cookies()));
}
