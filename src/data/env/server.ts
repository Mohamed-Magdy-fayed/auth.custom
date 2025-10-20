import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	server: {
		DB_PASSWORD: z.string().min(1),
		DB_USER: z.string().min(1),
		DB_NAME: z.string().min(1),
		DB_HOST: z.string().min(1),
		DB_PORT: z.string().min(1),

		OAUTH_REDIRECT_URL_BASE: z.url(),
		JWT_SECRET_KEY: z.string().min(32),

		GOOGLE_CLIENT_ID: z.string().min(1),
		GOOGLE_CLIENT_SECRET: z.string().min(1),
		GITHUB_CLIENT_ID: z.string().min(1).optional(),
		GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
		MICROSOFT_CLIENT_ID: z.string().min(1).optional(),
		MICROSOFT_CLIENT_SECRET: z.string().min(1).optional(),
		APPLE_CLIENT_ID: z.string().min(1).optional(),
		APPLE_TEAM_ID: z.string().min(1).optional(),
		APPLE_KEY_ID: z.string().min(1).optional(),
		APPLE_PRIVATE_KEY: z.string().min(1).optional(),

		COMMS_NAME: z.string().min(1),
		COMMS_EMAIL: z.email(),
		COMMS_EMAIL_PASS: z.string().min(1),
		COMMS_EMAIL_HOST: z.string().min(1),
		COMMS_EMAIL_PORT: z.coerce.number().int().positive(),

		BASE_URL: z.url(),
		STRIPE_SECRET_KEY: z.string().min(1).optional(),
		STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
	},

	createFinalSchema: (env) => {
		return z.object(env).transform((val) => {
			const { DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER, ...rest } = val;

			return {
				...rest,
				DATABASE_URL: `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}${DB_PORT}/${DB_NAME}`,
			};
		});
	},

	experimental__runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
