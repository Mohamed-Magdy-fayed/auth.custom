import { foreignKey, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "@/auth/tables/schema-helpers";
import { OrganizationsTable } from "./organizations-table";

export const TeamsTable = pgTable(
	"auth_teams",
	{
		id,
		createdAt,
		updatedAt,
		organizationId: uuid()
			.notNull()
			.references(() => OrganizationsTable.id, { onDelete: "cascade" }),
		parentTeamId: uuid(),
		name: text().notNull(),
		slug: text().notNull().unique(),
		description: text(),
		stripeCustomerId: text("stripe_customer_id").unique(),
		stripeSubscriptionId: text("stripe_subscription_id").unique(),
		stripeProductId: text("stripe_product_id"),
		planName: text("plan_name"),
		subscriptionStatus: text("subscription_status"),
	},
	(table) => [
		{
			parentFk: foreignKey({
				name: "auth_teams_parent_fk",
				columns: [table.parentTeamId],
				foreignColumns: [table.id],
			}).onDelete("cascade"),
		},
	],
);
