import { z } from "zod";
import { env } from "@/data/env/server";
import { OAuthClient } from "./base";

export function createMicrosoftOAuthClient() {
    if (!env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_CLIENT_SECRET) {
        throw new Error("Microsoft OAuth is not configured");
    }

    return new OAuthClient({
        provider: "microsoft",
        clientId: env.MICROSOFT_CLIENT_ID,
        clientSecret: env.MICROSOFT_CLIENT_SECRET,
        scopes: ["openid", "email", "profile", "User.Read"],
        urls: {
            auth: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
            token: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
            user: "https://graph.microsoft.com/v1.0/me",
        },
        userInfo: {
            schema: z.object({
                id: z.string(),
                displayName: z.string().nullable().optional(),
                mail: z.string().email().nullable().optional(),
                userPrincipalName: z.string().email().optional(),
            }),
            parser: (user) => ({
                id: user.id,
                email: user.mail ?? user.userPrincipalName ?? null,
                name: user.displayName ?? user.mail ?? user.userPrincipalName ?? null,
            }),
        },
    });
}
