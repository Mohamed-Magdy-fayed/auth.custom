import {
	bigint,
	boolean,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { UsersTable } from "./users-table";

export const BiometricCredentialsTable = pgTable(
	"auth_biometric_credentials",
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: uuid()
			.notNull()
			.references(() => UsersTable.id, { onDelete: "cascade" }),
		credentialId: text().notNull(),
		publicKey: text().notNull(),
		label: text(),
		transports: jsonb().$type<string[]>(),
		signCount: bigint({ mode: "number" }).notNull().default(0),
		aaguid: text(),
		isBackupEligible: boolean().notNull().default(false),
		isBackupState: boolean().notNull().default(false),
		isUserVerified: boolean().notNull().default(false),
		lastUsedAt: timestamp({ withTimezone: true }),
		createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp({ withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		{
			credentialUnique: uniqueIndex("auth_biometric_credentials_unique").on(
				table.credentialId,
			),
		},
	],
);
