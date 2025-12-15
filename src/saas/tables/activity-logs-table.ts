import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { OrganizationsTable } from "@/auth/tables/organizations-table";
import { createdAt, id } from "@/auth/tables/schema-helpers";
import { UsersTable } from "@/auth/tables/users-table";

export const activityTypeValues = [
	"SIGN_UP",
	"SIGN_IN",
	"SIGN_OUT",
	"UPDATE_PASSWORD",
	"DELETE_ACCOUNT",
	"UPDATE_ACCOUNT",
	"CREATE_TEAM",
	"REMOVE_TEAM_MEMBER",
	"INVITE_TEAM_MEMBER",
	"ACCEPT_INVITATION",
] as const;

export const ActivityType = Object.freeze(
	activityTypeValues.reduce(
		(acc, value) => {
			acc[value] = value;
			return acc;
		},
		{} as Record<
			(typeof activityTypeValues)[number],
			(typeof activityTypeValues)[number]
		>,
	),
);

export type ActivityType = (typeof activityTypeValues)[number];

export const activityTypeEnum = pgEnum(
	"saas_activity_type",
	activityTypeValues,
);

export const ActivityLogsTable = pgTable("saas_activity_logs", {
	id,
	createdAt,
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => OrganizationsTable.id, { onDelete: "cascade" }),
	userId: uuid("user_id").references(() => UsersTable.id, {
		onDelete: "set null",
	}),
	action: activityTypeEnum("action").notNull(),
	timestamp: timestamp("timestamp", { withTimezone: true })
		.notNull()
		.defaultNow(),
	ipAddress: text("ip_address"),
});
