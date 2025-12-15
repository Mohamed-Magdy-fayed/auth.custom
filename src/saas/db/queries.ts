import { and, count, desc, eq } from "drizzle-orm";
import { cache } from "react";
import { getCurrentUser } from "@/auth/nextjs/currentUser";
import { OrganizationMembershipsTable } from "@/auth/tables/organization-memberships-table";
import { OrganizationsTable } from "@/auth/tables/organizations-table";
import { UsersTable } from "@/auth/tables/users-table";
import { db } from "@/drizzle/db";
import {
	ActivityLogsTable,
	ActivityType,
} from "@/saas/tables/activity-logs-table";
import { InvitationsTable } from "@/saas/tables/invitations-table";

export type OrganizationRecord = typeof OrganizationsTable.$inferSelect;
export type OrganizationMembershipRecord =
	typeof OrganizationMembershipsTable.$inferSelect;
export type ActivityLogRecord = typeof ActivityLogsTable.$inferSelect;
export type InvitationRecord = typeof InvitationsTable.$inferSelect;
type MembershipBase = Pick<
	typeof OrganizationMembershipsTable.$inferSelect,
	"userId" | "organizationId" | "status" | "isDefault"
>;
type OrganizationMember = typeof OrganizationMembershipsTable.$inferSelect & {
	user: Pick<typeof UsersTable.$inferSelect, "id" | "name" | "email">;
};
type OrganizationWithMembers = OrganizationRecord & {
	memberships?: OrganizationMember[];
};
export type MembershipWithOrganization = MembershipBase & {
	organization: OrganizationRecord;
};

export const getAuthenticatedUser = cache(async () => {
	return getCurrentUser({ withFullUser: true });
});

export async function getUserWithOrganization(
	userId: string,
): Promise<MembershipWithOrganization | null> {
	const membership = (await db.query.OrganizationMembershipsTable.findFirst({
		columns: {
			organizationId: true,
			userId: true,
			status: true,
			isDefault: true,
		},
		where: and(
			eq(OrganizationMembershipsTable.userId, userId),
			eq(OrganizationMembershipsTable.status, "active"),
		),
		orderBy: [
			desc(OrganizationMembershipsTable.isDefault),
			desc(OrganizationMembershipsTable.createdAt),
		],
		with: { organization: true },
	})) as (MembershipBase & { organization: OrganizationRecord }) | undefined;

	if (!membership?.organization) return null;
	return {
		userId: membership.userId,
		organizationId: membership.organizationId,
		status: membership.status,
		isDefault: membership.isDefault,
		organization: membership.organization,
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

export async function getOrganizationDashboardStats(organizationId: string) {
	const [activeMembersResult, pendingInvitesResult] = await Promise.all([
		db
			.select({ value: count() })
			.from(OrganizationMembershipsTable)
			.where(
				and(
					eq(OrganizationMembershipsTable.organizationId, organizationId),
					eq(OrganizationMembershipsTable.status, "active"),
				),
			),
		db
			.select({ value: count() })
			.from(InvitationsTable)
			.where(
				and(
					eq(InvitationsTable.organizationId, organizationId),
					eq(InvitationsTable.status, "pending"),
				),
			),
	]);

	return {
		activeMembers: Number(activeMembersResult[0]?.value ?? 0),
		pendingInvites: Number(pendingInvitesResult[0]?.value ?? 0),
		managerCount: 0,
	};
}

export async function getRecentMembers(organizationId: string, limit = 5) {
	return db
		.select({
			userId: OrganizationMembershipsTable.userId,
			name: UsersTable.name,
			email: UsersTable.email,
			joinedAt: OrganizationMembershipsTable.joinedAt,
		})
		.from(OrganizationMembershipsTable)
		.innerJoin(UsersTable, eq(OrganizationMembershipsTable.userId, UsersTable.id))
		.where(
			and(
				eq(OrganizationMembershipsTable.organizationId, organizationId),
				eq(OrganizationMembershipsTable.status, "active"),
			),
		)
		.orderBy(desc(OrganizationMembershipsTable.createdAt))
		.limit(limit);
}

export async function getPendingInvitations(organizationId: string, limit = 5) {
	return db
		.select({
			email: InvitationsTable.email,
			invitedAt: InvitationsTable.createdAt,
		})
		.from(InvitationsTable)
		.where(
			and(
				eq(InvitationsTable.organizationId, organizationId),
				eq(InvitationsTable.status, "pending"),
			),
		)
		.orderBy(desc(InvitationsTable.createdAt))
		.limit(limit);
}

export async function getRecentOrganizationActivity(
	organizationId: string,
	limit = 5,
) {
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
		.where(eq(ActivityLogsTable.organizationId, organizationId))
		.orderBy(desc(ActivityLogsTable.timestamp))
		.limit(limit);
}

export async function getOrganizationForUser() {
	const user = await getAuthenticatedUser();
	if (!user) return null;

	const membership = (await db.query.OrganizationMembershipsTable.findFirst({
		where: and(
			eq(OrganizationMembershipsTable.userId, user.id),
			eq(OrganizationMembershipsTable.status, "active"),
		),
		with: {
			organization: {
				with: {
					memberships: {
						with: { user: { columns: { id: true, name: true, email: true } } },
					},
				},
			},
		},
	})) as
		| (MembershipBase & { organization: OrganizationWithMembers })
		| undefined;

	if (!membership?.organization) return null;

	const activeMembers = membership.organization.memberships?.filter(
		(member) => member.status === "active",
	);

	return {
		...membership.organization,
		members:
			activeMembers?.map((member) => ({
				organizationId: member.organizationId,
				userId: member.userId,
				joinedAt: member.joinedAt,
				status: member.status,
				user: member.user,
			})) ?? [],
	};
}

export async function logActivity(
	organizationId: string | null | undefined,
	userId: string,
	type: ActivityType,
	ipAddress?: string,
) {
	if (!organizationId) return;

	await db
		.insert(ActivityLogsTable)
		.values({ organizationId, userId, action: type, ipAddress });
}

export async function getInvitationByToken(token: string) {
	return db.query.InvitationsTable.findFirst({
		where: eq(InvitationsTable.token, token),
	});
}
