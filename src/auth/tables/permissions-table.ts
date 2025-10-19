import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"

export const PermissionsTable = pgTable(
    "auth_permissions",
    {
        id: uuid().primaryKey().defaultRandom(),
        key: text().notNull(),
        name: text().notNull(),
        description: text(),
        createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp({ withTimezone: true })
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    table => [{
        keyUniqueIndex: uniqueIndex("auth_permissions_key_unique").on(table.key),
    }]
)
