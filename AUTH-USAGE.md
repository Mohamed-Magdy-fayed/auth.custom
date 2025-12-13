# Using the auth module in a new project

1. Copy the `src/auth` folder, the auth routes under `src/app/(auth)`, and `src/middleware.ts` into your Next.js app (keep `drizzle.config.ts` and `drizzle/` if you want the same schema).
2. Install dependencies from `package.json` (or add the matching packages to your project) and run `npm install`.
3. Create `.env.local` from the provided template (database URL, auth secret, email/OAuth keys, app URL) and update `drizzle.config.ts` if your DB connection string changes.
4. Run the database migrations against your Postgres instance (`npm run db:migrate`), then start the app with `npm run dev`.
5. Ensure your root layout wraps the app in the translation provider and keep the middleware enabled so auth sessions and locale detection work.
