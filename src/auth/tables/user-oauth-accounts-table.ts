import {
    jsonb,
    pgEnum,
    pgTable,
    primaryKey,
    text,
    timestamp,
} from "drizzle-orm/pg-core";
import { createdAt, updatedAt, userId } from "@/auth/tables/schema-helpers";

export const oAuthProviderValues = [
    "google",
    "github",
    "microsoft",
    "apple",
] as const;
export type OAuthProvider = (typeof oAuthProviderValues)[number];
export const oAuthProviderEnum = pgEnum(
    "auth_oauth_provider",
    oAuthProviderValues,
);

export const UserOAuthAccountsTable = pgTable(
    "auth_user_oauth_accounts",
    {
        userId,
        createdAt,
        updatedAt,

        provider: oAuthProviderEnum().notNull(),
        providerAccountId: text().notNull(),
        displayName: text(),
        profileUrl: text(),
        accessToken: text(),
        refreshToken: text(),
        scopes: jsonb().$type<string[]>(),
        expiresAt: timestamp({ withTimezone: true }),
    },
    (t) => [primaryKey({ columns: [t.providerAccountId, t.provider] })],
);
