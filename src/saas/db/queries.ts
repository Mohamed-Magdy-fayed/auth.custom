import { and, count, desc, eq } from "drizzle-orm";
import { cache } from "react";
import { getCurrentUser } from "@/auth/nextjs/currentUser";
import { TeamMembershipsTable, TeamsTable, UsersTable } from "@/auth/tables";
import { db } from "@/drizzle/db";
import {
	ActivityLogsTable,
	ActivityType,
} from "@/saas/tables/activity-logs-table";
import { InvitationsTable } from "@/saas/tables/invitations-table";

export type TeamRecord = typeof TeamsTable.$inferSelect;
export type TeamMembershipRecord = typeof TeamMembershipsTable.$inferSelect;
export type ActivityLogRecord = typeof ActivityLogsTable.$inferSelect;
export type InvitationRecord = typeof InvitationsTable.$inferSelect;

export const getAuthenticatedUser = cache(async () => {
	return getCurrentUser({ withFullUser: true });
});

export async function getTeamByStripeCustomerId(customerId: string) {
	return db.query.TeamsTable.findFirst({
		where: eq(TeamsTable.stripeCustomerId, customerId),
	});
}

export async function updateTeamSubscription(
	teamId: string,
	subscriptionData: {
		stripeSubscriptionId: string | null;
		stripeProductId: string | null;
		planName: string | null;
		subscriptionStatus: string;
	},
) {
	await db
		.update(TeamsTable)
		.set({ ...subscriptionData })
		.where(eq(TeamsTable.id, teamId));
}

export async function getUserWithTeam(userId: string) {
	const membership = await db.query.TeamMembershipsTable.findFirst({
		columns: { teamId: true, userId: true, status: true },
		where: and(
			eq(TeamMembershipsTable.userId, userId),
			eq(TeamMembershipsTable.status, "active"),
		),
		with: {
			team: {
				columns: {
					id: true,
					name: true,
					description: true,
					slug: true,
					planName: true,
					stripeCustomerId: true,
					stripeProductId: true,
					stripeSubscriptionId: true,
					subscriptionStatus: true,
					createdAt: true,
					updatedAt: true,
					organizationId: true,
					parentTeamId: true,
				},
			},
		},
	});

	if (!membership) return null;
	return {
		userId: membership.userId,
		teamId: membership.teamId,
		team: membership.team,
	};
}

export async function getActivityLogs(limit = 10) {
	const user = await getAuthenticatedUser();
	if (!user) {
		throw new Error("User not authenticated");
	}

	return db
		.select({
			id: ActivityLogsTable.id,
			action: ActivityLogsTable.action,
			timestamp: ActivityLogsTable.timestamp,
			ipAddress: ActivityLogsTable.ipAddress,
			userName: UsersTable.name,
		})
		.from(ActivityLogsTable)
		.leftJoin(UsersTable, eq(ActivityLogsTable.userId, UsersTable.id))
		.where(eq(ActivityLogsTable.userId, user.id))
		.orderBy(desc(ActivityLogsTable.timestamp))
		.limit(limit);
}

export async function getTeamDashboardStats(teamId: string) {
	const [activeMembersResult, managerResult, pendingInvitesResult] =
		await Promise.all([
			db
				.select({ value: count() })
				.from(TeamMembershipsTable)
				.where(
					and(
						eq(TeamMembershipsTable.teamId, teamId),
						eq(TeamMembershipsTable.status, "active"),
					),
				),
			db
				.select({ value: count() })
				.from(TeamMembershipsTable)
				.where(
					and(
						eq(TeamMembershipsTable.teamId, teamId),
						eq(TeamMembershipsTable.status, "active"),
						eq(TeamMembershipsTable.isManager, true),
					),
				),
			db
				.select({ value: count() })
				.from(InvitationsTable)
				.where(
					and(
						eq(InvitationsTable.teamId, teamId),
						eq(InvitationsTable.status, "pending"),
					),
				),
		]);

	return {
		activeMembers: Number(activeMembersResult[0]?.value ?? 0),
		managerCount: Number(managerResult[0]?.value ?? 0),
		pendingInvites: Number(pendingInvitesResult[0]?.value ?? 0),
	};
}

export async function getRecentTeamMembers(teamId: string, limit = 5) {
	return db
		.select({
			userId: TeamMembershipsTable.userId,
			name: UsersTable.name,
			email: UsersTable.email,
			joinedAt: TeamMembershipsTable.joinedAt,
			isManager: TeamMembershipsTable.isManager,
		})
		.from(TeamMembershipsTable)
		.innerJoin(UsersTable, eq(TeamMembershipsTable.userId, UsersTable.id))
		.where(
			and(
				eq(TeamMembershipsTable.teamId, teamId),
				eq(TeamMembershipsTable.status, "active"),
			),
		)
		.orderBy(desc(TeamMembershipsTable.createdAt))
		.limit(limit);
}

export async function getPendingInvitations(teamId: string, limit = 5) {
	return db
		.select({
			email: InvitationsTable.email,
			roleKey: InvitationsTable.roleKey,
			invitedAt: InvitationsTable.createdAt,
		})
		.from(InvitationsTable)
		.where(
			and(
				eq(InvitationsTable.teamId, teamId),
				eq(InvitationsTable.status, "pending"),
			),
		)
		.orderBy(desc(InvitationsTable.createdAt))
		.limit(limit);
}

export async function getRecentTeamActivity(teamId: string, limit = 5) {
	return db
		.select({
			id: ActivityLogsTable.id,
			action: ActivityLogsTable.action,
			timestamp: ActivityLogsTable.timestamp,
			userName: UsersTable.name,
			userEmail: UsersTable.email,
		})
		.from(ActivityLogsTable)
		.leftJoin(UsersTable, eq(ActivityLogsTable.userId, UsersTable.id))
		.where(eq(ActivityLogsTable.teamId, teamId))
		.orderBy(desc(ActivityLogsTable.timestamp))
		.limit(limit);
}

export async function getTeamForUser() {
	const user = await getAuthenticatedUser();
	if (!user) return null;

	const membership = await db.query.TeamMembershipsTable.findFirst({
		where: and(
			eq(TeamMembershipsTable.userId, user.id),
			eq(TeamMembershipsTable.status, "active"),
		),
		with: {
			team: {
				with: {
					memberships: {
						with: { user: { columns: { id: true, name: true, email: true } } },
					},
				},
			},
		},
	});

	if (!membership?.team) return null;

	const activeMembers = membership.team.memberships?.filter(
		(member) => member.status === "active",
	);

	return {
		...membership.team,
		teamMembers:
			activeMembers?.map((member) => ({
				teamId: member.teamId,
				userId: member.userId,
				roleId: member.roleId,
				isManager: member.isManager,
				joinedAt: member.joinedAt,
				status: member.status,
				user: member.user,
			})) ?? [],
	};
}

export async function logActivity(
	teamId: string | null | undefined,
	userId: string,
	type: ActivityType,
	ipAddress?: string,
) {
	if (!teamId) return;

	await db
		.insert(ActivityLogsTable)
		.values({ teamId, userId, action: type, ipAddress });
}

export async function getInvitationByToken(token: string) {
	return db.query.InvitationsTable.findFirst({
		where: eq(InvitationsTable.token, token),
	});
}
