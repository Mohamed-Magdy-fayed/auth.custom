import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { OrganizationsTable } from "@/auth/tables/organizations-table";
import { createdAt, id, updatedAt } from "@/auth/tables/schema-helpers";
import { UsersTable } from "@/auth/tables/users-table";

export const invitationStatusValues = [
	"pending",
	"accepted",
	"revoked",
] as const;
export type InvitationStatus = (typeof invitationStatusValues)[number];

export const invitationStatusEnum = pgEnum(
	"saas_invitation_status",
	invitationStatusValues,
);

export const InvitationsTable = pgTable("saas_invitations", {
	id,
	createdAt,
	updatedAt,
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => OrganizationsTable.id, { onDelete: "cascade" }),
	email: text("email").notNull(),
	invitedByUserId: uuid("invited_by_user_id").references(() => UsersTable.id, {
		onDelete: "set null",
	}),
	status: invitationStatusEnum("status").notNull().default("pending"),
	token: text("token").notNull().unique(),
	acceptedAt: timestamp("accepted_at", { withTimezone: true }),
});
