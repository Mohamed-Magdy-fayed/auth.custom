"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { OrganizationMembershipsTable } from "@/auth/tables/organization-memberships-table";
import { OrganizationsTable } from "@/auth/tables/organizations-table";
import { UserCredentialsTable } from "@/auth/tables/user-credentials-table";
import {
	OAuthProvider,
	oAuthProviderValues,
} from "@/auth/tables/user-oauth-accounts-table";
import { UsersTable } from "@/auth/tables/users-table";
import { db } from "@/drizzle/db";
import { getT } from "@/lib/i18n/actions";
import { slugify } from "@/lib/utils";
import { InvitationsTable } from "@/saas/tables/invitations-table";
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

export async function signIn(unsafeData: z.infer<typeof signInSchema>) {
	const { t } = await getT();
	const { success, data } = signInSchema.safeParse(unsafeData);

	if (!success) return t("authTranslations.signIn.error.generic");

	const normalizedEmail = normalizeEmail(data.email);

	type UserWithCredentials = Pick<
		typeof UsersTable.$inferSelect,
		"id" | "email" | "status"
	> & {
		credentials: Pick<
			typeof UserCredentialsTable.$inferSelect,
			"passwordHash" | "passwordSalt"
		> | null;
	};

	const user = (await db.query.UsersTable.findFirst({
		columns: { id: true, email: true, status: true },
		where: eq(UsersTable.emailNormalized, normalizedEmail),
		with: {
			credentials: { columns: { passwordHash: true, passwordSalt: true } },
		},
	})) as UserWithCredentials | undefined;

	if (
		user == null ||
		user.credentials == null ||
		user.credentials.passwordHash == null ||
		user.credentials.passwordSalt == null
	) {
		return t("authTranslations.signIn.error.generic");
	}

	if (user.status !== "active") {
		return t("authTranslations.signIn.error.inactive");
	}

	const isCorrectPassword = await comparePasswords({
		hashedPassword: user.credentials.passwordHash,
		password: data.password,
		salt: user.credentials.passwordSalt,
	});

	if (!isCorrectPassword) return t("authTranslations.signIn.error.generic");

	const sessionCookies = await cookies();

	await createSession({ id: user.id }, sessionCookies);

	if (data.redirect && data.redirect !== "checkout") {
		redirect(data.redirect);
	}

	redirect("/dashboard");
}

export async function signUp(unsafeData: z.infer<typeof signUpSchema>) {
	const { t } = await getT();
	const result = signUpSchema.safeParse(unsafeData);

	if (!result.success) {
		console.warn("signUp validation failed", result.error.flatten());
		return result.error.issues[0]?.message ?? t("authTranslations.signUp.error.generic");
	}

	const data = result.data;
	const normalizedEmail = normalizeEmail(data.email);
	const duplicateMessage = t("authTranslations.signUp.error.duplicate");
	const invalidInvitationMessage = t("authTranslations.signUp.error.invalidInvite");

	const sessionCookies = await cookies();
	const now = new Date();

	type SignUpProvisionResult = {
		sessionUser: { id: string };
		organization: typeof OrganizationsTable.$inferSelect;
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

					const organizationMembershipValues = {
						organizationId: invitation.organizationId,
						userId: createdUser.id,
						status: "active" as const,
						isDefault: true,
						invitedByUserId: invitation.invitedByUserId ?? null,
						joinedAt: now,
					};

					await trx
						.insert(OrganizationMembershipsTable)
						.values(organizationMembershipValues)
						.onConflictDoNothing();

					await trx
						.update(InvitationsTable)
						.set({ status: "accepted", acceptedAt: now })
						.where(eq(InvitationsTable.id, invitation.id));

					const invitedOrg = await trx.query.OrganizationsTable.findFirst({
						where: eq(OrganizationsTable.id, invitation.organizationId),
					});

					if (!invitedOrg) {
						throw new Error("Organization not found for invitation");
					}

					return {
						sessionUser: { id: createdUser.id },
						organization: invitedOrg,
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

				await trx
					.insert(OrganizationMembershipsTable)
					.values({
						organizationId: organization.id,
						userId: createdUser.id,
						status: "active",
						isDefault: true,
						joinedAt: now,
					});

				return {
					sessionUser: { id: createdUser.id },
					organization,
					acceptedInvitation: false,
				};
			},
		);

		await createSession(signUpResult.sessionUser, sessionCookies);

		redirect("/dashboard");
	} catch (error: any) {
		if (error?.message === duplicateMessage) {
			return duplicateMessage;
		}

		if (error?.message === invalidInvitationMessage) {
			return invalidInvitationMessage;
		}

		console.error(error);
		return t("authTranslations.signUp.error.generic");
	}
}

export async function logOut() {
	const cookieStore = await cookies();
	const session = await getSessionFromCookie(cookieStore);

	await removeSession({ delete: (val) => cookieStore.delete(val) });

	redirect("/sign-in");
}

export async function oAuthSignIn(provider: OAuthProvider) {
	const { t } = await getT();

	if (!oAuthProviderValues.includes(provider)) {
		return { error: t("authTranslations.oauth.error.connectFailed") };
	}

	if (!isOAuthProviderConfigured(provider)) {
		return {
			error: t("authTranslations.oauth.providerUnavailable", {
				provider: providerDisplayNames[provider],
			}),
		};
	}

	const oAuthClient = getOAuthClient(provider);
	redirect(oAuthClient.createAuthUrl(await cookies()));
}
