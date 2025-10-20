import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const UserCredentialsTable = pgTable("auth_user_credentials", {
	userId: uuid("user_id").notNull(),
	passwordHash: text().notNull(),
	passwordSalt: text().notNull(),
	expiresAt: timestamp({ withTimezone: true }),
	mustChangePassword: boolean().notNull().default(false),
	lastChangedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
