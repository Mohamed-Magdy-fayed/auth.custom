import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { TeamsTable, UsersTable } from "@/auth/tables";
import { createdAt, id, updatedAt } from "@/auth/tables/schema-helpers";

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
	teamId: uuid("team_id")
		.notNull()
		.references(() => TeamsTable.id, { onDelete: "cascade" }),
	email: text("email").notNull(),
	roleKey: text("role_key").notNull(),
	invitedByUserId: uuid("invited_by_user_id").references(() => UsersTable.id, {
		onDelete: "set null",
	}),
	status: invitationStatusEnum("status").notNull().default("pending"),
	token: text("token").notNull().unique(),
	acceptedAt: timestamp("accepted_at", { withTimezone: true }),
});
