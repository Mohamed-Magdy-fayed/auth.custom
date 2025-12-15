"use server";

import { and, desc, eq, inArray, notInArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { createTokenValue } from "@/auth/core/token";
import { OrganizationMembershipsTable } from "@/auth/tables/organization-memberships-table";
import { OrganizationsTable } from "@/auth/tables/organizations-table";
import { UsersTable } from "@/auth/tables/users-table";
import { db } from "@/drizzle/db";
import { getT } from "@/lib/i18n/actions";
import { slugify } from "@/lib/utils";
import { logActivity } from "@/saas/db/queries";
import { ActivityType } from "@/saas/tables/activity-logs-table";
import { InvitationsTable } from "@/saas/tables/invitations-table";
import { getCurrentUser } from "../../../nextjs/currentUser";
import { sendInvitationEmail } from "../../../nextjs/emails/invitation";
import {
	type CreateOrganizationInput,
	createOrganizationSchema,
	type InviteMemberInput,
	inviteMemberSchema,
	setActiveOrganizationSchema,
	type UpsertUserOrganizationsInput,
	upsertUserOrganizationsSchema,
} from "./schemas";

function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

async function resolveOrigin() {
	const headerList = await headers();
	return (
		headerList.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? undefined
	);
}

function validationError(error: z.ZodError) {
	const flat = error.flatten();
	return {
		success: false as const,
		message: flat.formErrors[0] ?? "Invalid input",
		fieldErrors: flat.fieldErrors as Record<string, string[]>,
	};
}

async function generateUniqueOrganizationSlug(name: string) {
	const base = slugify(name) || "organization";
	let candidate = base;
	let suffix = 1;

	while (
		await db.query.OrganizationsTable.findFirst({
			columns: { id: true },
			where: eq(OrganizationsTable.slug, candidate),
		})
	) {
		candidate = `${base}-${suffix++}`;
	}

	return candidate;
}

export async function createOrganization(input: CreateOrganizationInput) {
	const parsed = createOrganizationSchema.safeParse(input);
	if (!parsed.success) return validationError(parsed.error);

	const currentUser = await getCurrentUser({ redirectIfNotFound: true });
	const { t } = await getT();

	const slug = await generateUniqueOrganizationSlug(parsed.data.name);

	try {
		const [organization] = await db
			.insert(OrganizationsTable)
			.values({
				name: parsed.data.name.trim(),
				slug,
				description: parsed.data.description?.trim() || null,
				createdById: currentUser.id,
			})
			.returning();

		await db
			.insert(OrganizationMembershipsTable)
			.values({
				organizationId: organization.id,
				userId: currentUser.id,
				status: "active",
				isDefault: true,
			})
			.onConflictDoNothing();

		await db
			.update(OrganizationMembershipsTable)
			.set({ isDefault: false })
			.where(
				and(
					eq(OrganizationMembershipsTable.userId, currentUser.id),
					notInArray(OrganizationMembershipsTable.organizationId, [organization.id]),
				),
			);

		revalidatePath("/dashboard");
		return {
			success: true as const,
			message: t("authTranslations.org.actions.createOrganization.success"),
		};
	} catch (error) {
		console.error(error);
		return {
			success: false as const,
			message: t("authTranslations.org.actions.createOrganization.error"),
		};
	}
}

export async function deleteOrganization(organizationId: string) {
	const currentUser = await getCurrentUser({ redirectIfNotFound: true });
	const { t } = await getT();

	const organization = await db.query.OrganizationsTable.findFirst({
		columns: { id: true, createdById: true },
		where: eq(OrganizationsTable.id, organizationId),
	});

	if (!organization) {
		return {
			success: false as const,
			message: t("authTranslations.org.actions.deleteOrganization.notFound"),
		};
	}

	if (organization.createdById !== currentUser.id) {
		return {
			success: false as const,
			message: t("authTranslations.org.actions.deleteOrganization.ownerOnly"),
		};
	}

	await db
		.delete(OrganizationsTable)
		.where(eq(OrganizationsTable.id, organizationId));
	revalidatePath("/dashboard");
	return {
		success: true as const,
		message: t("authTranslations.org.actions.deleteOrganization.success"),
	};
}

export async function setActiveOrganization(organizationId: string) {
	const parsed = setActiveOrganizationSchema.safeParse({ organizationId });
	if (!parsed.success) return validationError(parsed.error);

	const currentUser = await getCurrentUser({ redirectIfNotFound: true });
	const { t } = await getT();

	const membership = await db.query.OrganizationMembershipsTable.findFirst({
		columns: { organizationId: true, userId: true, status: true },
		where: and(
			eq(OrganizationMembershipsTable.organizationId, parsed.data.organizationId),
			eq(OrganizationMembershipsTable.userId, currentUser.id),
			eq(OrganizationMembershipsTable.status, "active"),
		),
	});

	if (!membership) {
		return {
			success: false as const,
			message: t("authTranslations.org.actions.common.noOrgAccess"),
		};
	}

	await db
		.update(OrganizationMembershipsTable)
		.set({ isDefault: false })
		.where(eq(OrganizationMembershipsTable.userId, currentUser.id));

	await db
		.update(OrganizationMembershipsTable)
		.set({ isDefault: true })
		.where(
			and(
				eq(OrganizationMembershipsTable.userId, currentUser.id),
				eq(OrganizationMembershipsTable.organizationId, parsed.data.organizationId),
			),
		);

	revalidatePath("/dashboard");
	return {
		success: true as const,
		message: t("authTranslations.org.actions.setActiveOrganization.success"),
	};
}

export async function upsertUserOrganizations(
	input: UpsertUserOrganizationsInput,
) {
	const parsed = upsertUserOrganizationsSchema.safeParse(input);
	if (!parsed.success) return validationError(parsed.error);

	const { t } = await getT();
	const { userId, organizationIds } = parsed.data;

	const existing = await db
		.select({ organizationId: OrganizationMembershipsTable.organizationId })
		.from(OrganizationMembershipsTable)
		.where(eq(OrganizationMembershipsTable.userId, userId));

	const existingIds = existing.map((row) => row.organizationId);
	const toAdd = organizationIds.filter((id) => !existingIds.includes(id));
	const toRemove = existingIds.filter((id) => !organizationIds.includes(id));

	if (toAdd.length > 0) {
		await db
			.insert(OrganizationMembershipsTable)
			.values(
				toAdd.map((orgId) => ({
					organizationId: orgId,
					userId,
					status: "active" as const,
					isDefault: false,
				})),
			);
	}

	if (toRemove.length > 0) {
		await db
			.delete(OrganizationMembershipsTable)
			.where(
				and(
					eq(OrganizationMembershipsTable.userId, userId),
					inArray(OrganizationMembershipsTable.organizationId, toRemove),
				),
			);
	}

	return { success: true as const, message: t("authTranslations.org.actions.members.update") };
}

export async function sendInvitation(input: InviteMemberInput) {
	const { t } = await getT();

	const parsed = inviteMemberSchema.safeParse(input);

	if (!parsed.success) {
		const message = t("dashboardPage.invites.form.invalidEmail");
		return { success: false as const, message, fieldErrors: { email: message } };
	}

	const currentUser = await getCurrentUser({
		redirectIfNotFound: true,
		withFullUser: true,
	});
	const normalizedEmail = normalizeEmail(parsed.data.email);
	const userEmail = currentUser.email ? normalizeEmail(currentUser.email) : null;

	if (userEmail && userEmail === normalizedEmail) {
		const message = t("dashboardPage.invites.form.selfInvite");
		return { success: false as const, message, fieldErrors: { email: message } };
	}

	const membership = await db.query.OrganizationMembershipsTable.findFirst({
		columns: { organizationId: true, status: true, isDefault: true },
		where: and(
			eq(OrganizationMembershipsTable.userId, currentUser.id),
			eq(OrganizationMembershipsTable.status, "active"),
		),
		orderBy: [
			desc(OrganizationMembershipsTable.isDefault),
			desc(OrganizationMembershipsTable.createdAt),
		],
		with: { organization: { columns: { id: true, name: true } } },
	});

	if (!membership?.organization) {
		return {
			success: false as const,
			message: t("dashboardPage.invites.form.noOrg"),
		};
	}

	const organization = membership.organization as Pick<
		typeof OrganizationsTable.$inferSelect,
		"id" | "name"
	>;

	const existingPending = await db.query.InvitationsTable.findFirst({
		where: and(
			eq(InvitationsTable.organizationId, organization.id),
			eq(InvitationsTable.email, normalizedEmail),
			eq(InvitationsTable.status, "pending"),
		),
	});

	if (existingPending) {
		const message = t("dashboardPage.invites.form.alreadyPending");
		return { success: false as const, message, fieldErrors: { email: message } };
	}

	const invitedUser = await db.query.UsersTable.findFirst({
		columns: { id: true },
		where: eq(UsersTable.emailNormalized, normalizedEmail),
	});

	if (invitedUser) {
		const membershipForInvitee =
			await db.query.OrganizationMembershipsTable.findFirst({
				columns: { status: true },
				where: and(
					eq(OrganizationMembershipsTable.organizationId, organization.id),
					eq(OrganizationMembershipsTable.userId, invitedUser.id),
				),
			});

		if (membershipForInvitee?.status === "active") {
			const message = t("dashboardPage.invites.form.alreadyMember");
			return { success: false as const, message, fieldErrors: { email: message } };
		}
	}

	const origin = await resolveOrigin();

	if (!origin) {
		return {
			success: false as const,
			message: t("dashboardPage.invites.form.missingOrigin"),
		};
	}

	const token = createTokenValue();
	const inviteUrl = `${origin}/sign-up?${new URLSearchParams({ inviteToken: token }).toString()}`;

	try {
		await db
			.insert(InvitationsTable)
			.values({
				organizationId: organization.id,
				email: normalizedEmail,
				invitedByUserId: currentUser.id,
				token,
				status: "pending",
			});

		await sendInvitationEmail({
			to: parsed.data.email.trim(),
			organizationName: organization.name ?? "",
			inviteUrl,
			inviterName: currentUser.name || currentUser.email || undefined,
		});

		await logActivity(
			organization.id,
			currentUser.id,
			ActivityType.INVITE_TEAM_MEMBER,
		);

		revalidatePath("/dashboard");

		return {
			success: true as const,
			message: t("dashboardPage.invites.form.success", {
				email: parsed.data.email.trim(),
			}),
		};
	} catch (error) {
		console.error("Failed to send invitation", error);
		return {
			success: false as const,
			message: t("dashboardPage.invites.form.genericError"),
		};
	}
}

export async function listOrganizationsForUser(userId?: string) {
	const user = userId
		? await db.query.UsersTable.findFirst({
			columns: { id: true },
			where: eq(UsersTable.id, userId),
		})
		: await getCurrentUser({ redirectIfNotFound: true });

	if (!user) return [];

	const memberships = (await db.query.OrganizationMembershipsTable.findMany({
		where: and(
			eq(OrganizationMembershipsTable.userId, user.id),
			eq(OrganizationMembershipsTable.status, "active"),
		),
		orderBy: [
			desc(OrganizationMembershipsTable.isDefault),
			desc(OrganizationMembershipsTable.createdAt),
		],
		with: {
			organization: {
				columns: {
					id: true,
					name: true,
					slug: true,
					description: true,
					createdAt: true,
				},
			},
		},
	})) as Array<
		Pick<
			typeof OrganizationMembershipsTable.$inferSelect,
			"isDefault" | "status"
		> & {
			organization: Pick<
				typeof OrganizationsTable.$inferSelect,
				"id" | "name" | "slug" | "description" | "createdAt"
			>;
		}
	>;

	return memberships.map((membership) => ({
		...membership.organization,
		isDefault: membership.isDefault,
		status: membership.status,
	}));
}
