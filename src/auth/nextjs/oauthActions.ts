"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
	OAuthProvider,
	UserCredentialsTable,
	UserOAuthAccountsTable,
} from "@/auth/tables";
import { db } from "@/drizzle/db";
import {
	getConfiguredOAuthProviders,
	providerDisplayNames,
} from "../core/oauth/providers";
import { getCurrentUser } from "./currentUser";

export async function listOAuthConnections() {
	const user = await getCurrentUser({ redirectIfNotFound: true });

	const accounts = await db.query.UserOAuthAccountsTable.findMany({
		columns: { provider: true, providerAccountId: true, createdAt: true },
		where: eq(UserOAuthAccountsTable.userId, user.id),
	});

	const connectedMap = new Map<OAuthProvider, (typeof accounts)[number]>();
	for (const account of accounts) {
		connectedMap.set(account.provider, account);
	}

	const providerSet = new Set(getConfiguredOAuthProviders());
	for (const account of accounts) {
		providerSet.add(account.provider);
	}

	return Array.from(providerSet).map((provider) => ({
		provider,
		displayName: providerDisplayNames[provider],
		connected: connectedMap.has(provider),
		connectedAt: connectedMap.get(provider)?.createdAt ?? null,
	}));
}

export async function disconnectOAuthAccount(provider: OAuthProvider) {
	const user = await getCurrentUser({ redirectIfNotFound: true });

	const account = await db.query.UserOAuthAccountsTable.findFirst({
		columns: { providerAccountId: true },
		where: and(
			eq(UserOAuthAccountsTable.userId, user.id),
			eq(UserOAuthAccountsTable.provider, provider),
		),
	});

	if (!account) {
		return { success: false, message: "Provider is not linked" };
	}

	const [credentialCount, providerCount] = await Promise.all([
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(UserCredentialsTable)
			.where(eq(UserCredentialsTable.userId, user.id)),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(UserOAuthAccountsTable)
			.where(eq(UserOAuthAccountsTable.userId, user.id)),
	]);

	const hasPassword = Number(credentialCount[0]?.count ?? 0) > 0;
	const totalProviders = Number(providerCount[0]?.count ?? 0);

	if (!hasPassword && totalProviders <= 1) {
		return { success: false, message: "Cannot remove the only sign-in method" };
	}

	await db
		.delete(UserOAuthAccountsTable)
		.where(
			and(
				eq(UserOAuthAccountsTable.userId, user.id),
				eq(UserOAuthAccountsTable.provider, provider),
			),
		);

	revalidatePath("/");

	return { success: true, message: "Connection removed" };
}
