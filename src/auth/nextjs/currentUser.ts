import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { UsersTable } from "@/auth/tables/users-table";
import { db } from "@/drizzle/db";
import { getSessionFromCookie } from "../core/session";

type FullUser = Exclude<
	Awaited<ReturnType<typeof getUserFromDb>>,
	undefined | null
>;

type User = Exclude<
	Awaited<ReturnType<typeof getSessionFromCookie>>,
	undefined | null
>;

function _getCurrentUser(options: {
	withFullUser: true;
	redirectIfNotFound: true;
}): Promise<FullUser>;
function _getCurrentUser(options: {
	withFullUser: true;
	redirectIfNotFound?: false;
}): Promise<FullUser | null>;
function _getCurrentUser(options: {
	withFullUser?: false;
	redirectIfNotFound: true;
}): Promise<User>;
function _getCurrentUser(options?: {
	withFullUser?: false;
	redirectIfNotFound?: false;
}): Promise<User | null>;
async function _getCurrentUser({
	withFullUser = false,
	redirectIfNotFound = false,
} = {}) {
	const user = await getSessionFromCookie(await cookies());

	if (user == null) {
		if (redirectIfNotFound) return redirect("/sign-in");
		return null;
	}

	if (withFullUser) {
		const fullUser = await getUserFromDb(user.id);
		// This should never happen
		if (fullUser == null) throw new Error("User not found in database");
		return fullUser;
	}

	return user;
}

export const getCurrentUser = cache(_getCurrentUser);

function getUserFromDb(id: string) {
	return db.query.UsersTable.findFirst({
		columns: {
			id: true,
			email: true,
			emailVerifiedAt: true,
			name: true,
			status: true,
			locale: true,
			timezone: true,
		},
		where: eq(UsersTable.id, id),
		with: {},
	});
}
