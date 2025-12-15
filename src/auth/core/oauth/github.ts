import { z } from "zod";
import { env } from "@/data/env/server";
import { OAuthClient } from "./base";

const githubEmailSchema = z
	.object({
		email: z.email(),
		primary: z.boolean().optional(),
		verified: z.boolean().optional(),
	})
	.array();

export function createGithubOAuthClient() {
	if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
		throw new Error("GitHub OAuth is not configured");
	}

	return new OAuthClient({
		provider: "github",
		clientId: env.GITHUB_CLIENT_ID,
		clientSecret: env.GITHUB_CLIENT_SECRET,
		scopes: ["read:user", "user:email"],
		urls: {
			auth: "https://github.com/login/oauth/authorize",
			token: "https://github.com/login/oauth/access_token",
			user: "https://api.github.com/user",
		},
		userHeaders: {
			Accept: "application/vnd.github+json",
			"User-Agent": "custom-nextjs-auth",
		},
		userInfo: {
			schema: z.object({
				id: z.coerce.string(),
				email: z.email().nullable().optional(),
				name: z.string().nullable().optional(),
				login: z.string(),
			}),
			parser: (user) => ({
				id: user.id,
				email: user.email ?? null,
				name: user.name ?? user.login,
			}),
			resolveEmail: async ({ accessToken, tokenType }) => {
				const response = await fetch("https://api.github.com/user/emails", {
					headers: {
						Authorization: `${tokenType} ${accessToken}`,
						Accept: "application/vnd.github+json",
						"User-Agent": "custom-nextjs-auth",
					},
				});

				if (!response.ok) {
					return null;
				}

				const data = githubEmailSchema.safeParse(await response.json());
				if (!data.success) return null;

				const primary = data.data.find((item) => item.primary);
				if (primary?.email) return primary.email;

				const verified = data.data.find((item) => item.verified);
				return verified?.email ?? data.data[0]?.email ?? null;
			},
		},
	});
}
