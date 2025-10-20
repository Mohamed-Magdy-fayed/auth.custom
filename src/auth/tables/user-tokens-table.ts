import { jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { createdAt, id, userId } from "@/auth/tables/schema-helpers";
import { UsersTable } from "./users-table";

export const userTokenTypeValues = [
	"email_verification",
	"password_reset",
	"magic_link",
	"otp",
	"device_trust",
] as const;
export type UserTokenType = (typeof userTokenTypeValues)[number];
export const userTokenTypeEnum = pgEnum(
	"auth_user_token_type",
	userTokenTypeValues,
);

export const UserTokensTable = pgTable("auth_user_tokens", {
	id,
	userId: userId.references(() => UsersTable.id, { onDelete: "cascade" }),
	createdAt,

	tokenHash: text().notNull().unique(),
	type: userTokenTypeEnum().notNull(),
	expiresAt: timestamp({ withTimezone: true }).notNull(),
	consumedAt: timestamp({ withTimezone: true }),
	metadata: jsonb().$type<Record<string, unknown> | null>().default(null),
});
