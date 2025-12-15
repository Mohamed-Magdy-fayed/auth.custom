import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getOAuthClient } from "@/auth/core/oauth/base";
import { createSession, getSessionFromCookie } from "@/auth/core/session";
import { OrganizationMembershipsTable } from "@/auth/tables/organization-memberships-table";
import { OrganizationsTable } from "@/auth/tables/organizations-table";
import {
	OAuthProvider,
	oAuthProviderValues,
	UserOAuthAccountsTable,
} from "@/auth/tables/user-oauth-accounts-table";
import { UsersTable } from "@/auth/tables/users-table";
import { db } from "@/drizzle/db";
import { getT } from "@/lib/i18n/actions";
import { slugify } from "@/lib/utils";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ provider: string }> },
) {
	const { t } = await getT();
	const { provider: rawProvider } = await params;
	const code = request.nextUrl.searchParams.get("code");
	const state = request.nextUrl.searchParams.get("state");
	const provider = z.enum(oAuthProviderValues).parse(rawProvider);

	if (typeof code !== "string" || typeof state !== "string") {
		redirect(
			`/sign-in?oauthError=${encodeURIComponent(
				t("authTranslations.oauth.error.connectFailed"),
			)}`,
		);
	}

	const cookieJar = await cookies();
	const currentSession = await getSessionFromCookie(cookieJar);
	const oAuthClient = getOAuthClient(provider);
	try {
		const oAuthUser = await oAuthClient.fetchUser(code, state, cookieJar);

		let user: { id: string } | null = null;

		if (currentSession?.id) {
			user = await connectUserToAccount(oAuthUser, provider, {
				currentUserId: currentSession.id,
				t,
			});
		} else {
			const existingUser = await db.query.UserOAuthAccountsTable.findFirst({
				where: eq(UserOAuthAccountsTable.providerAccountId, oAuthUser.id),
			});

			user = await connectUserToAccount(oAuthUser, provider, {
				currentUserId: existingUser?.userId,
				t,
			});
		}

		await createSession({ id: user.id }, cookieJar);
	} catch (error: any) {
		console.error(error);
		redirect(
			`/sign-in?oauthError=${encodeURIComponent(
				t("authTranslations.oauth.error.connectFailed"),
			)}`,
		);
	}

	redirect("/app");
}

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

type ConnectOptions = {
	currentUserId?: string;
	t: Awaited<ReturnType<typeof getT>>["t"];
};

function connectUserToAccount(
	{ id, email, name }: { id: string; email: string; name: string },
	provider: OAuthProvider,
	options: ConnectOptions,
) {
	return db.transaction(async (trx) => {
		const normalizedEmail = normalizeEmail(email);
		const existingUser = options.currentUserId
			? await trx.query.UsersTable.findFirst({
				columns: { id: true, emailVerifiedAt: true },
				where: eq(UsersTable.id, options.currentUserId),
			})
			: await trx.query.UsersTable.findFirst({
				columns: { id: true, emailVerifiedAt: true },
				where: eq(UsersTable.emailNormalized, normalizedEmail),
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

			await ensureDefaultOrganization(trx, { userId: newUser.id, name });

			user = newUser;
		} else {
			const existingAccount = await trx.query.UserOAuthAccountsTable.findFirst({
				columns: { userId: true },
				where: and(
					eq(UserOAuthAccountsTable.provider, provider),
					eq(UserOAuthAccountsTable.providerAccountId, id),
				),
			});

			if (existingAccount && existingAccount.userId !== user.id) {
				throw new Error(options.t("authTranslations.oauth.error.alreadyLinked"));
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

		return { id: user.id };
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
