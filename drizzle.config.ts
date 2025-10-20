import type { Config } from "drizzle-kit";
import { env } from "@/data/env/server";

export default {
	schema: "./src/drizzle/schema.ts",
	out: "./src/drizzle/migrations",
	dialect: "postgresql",
	dbCredentials: { url: env.DATABASE_URL },
	migrations: { schema: "public", table: "drizzle_migrations" },
} satisfies Config;
