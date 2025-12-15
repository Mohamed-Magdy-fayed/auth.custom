import { eq } from "drizzle-orm";

import { isFeatureEnabled } from "@/auth/config/features";
import { listPasskeys } from "@/auth/features/passkeys/server/actions";
import { getCurrentUser } from "@/auth/nextjs/currentUser";
import { UserCredentialsTable } from "@/auth/tables/user-credentials-table";
import { db } from "@/drizzle/db";

export type AppShellContext = Awaited<ReturnType<typeof loadAppContext>>;

export async function loadAppContext() {
	const currentSessionUser = await getCurrentUser({ redirectIfNotFound: true });
	const fullUser = await getCurrentUser({
		redirectIfNotFound: true,
		withFullUser: true,
	});
	const passkeysEnabled = isFeatureEnabled("passkeys");

	const [passkeys, credentials] = await Promise.all([
		passkeysEnabled ? listPasskeys() : Promise.resolve([]),
		db.query.UserCredentialsTable.findFirst({
			columns: { userId: true },
			where: eq(UserCredentialsTable.userId, fullUser.id),
		}),
	]);

	const profileName = fullUser.name ?? "";
	const initials = getInitials(profileName);
	const isAdmin = currentSessionUser.role === "admin";
	const hasPassword = credentials != null;
	const emailVerified = fullUser.emailVerifiedAt != null;

	return {
		currentSessionUser,
		fullUser,
		passkeys,
		profileName,
		initials,
		isAdmin,
		hasPassword,
		emailVerified,
	};
}

function getInitials(value: string) {
	const words = value.trim().split(/\s+/);
	if (words.length === 0) return "?";
	if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
	return (
		words[0]!.charAt(0) + words[words.length - 1]!.charAt(0)
	).toUpperCase();
}
