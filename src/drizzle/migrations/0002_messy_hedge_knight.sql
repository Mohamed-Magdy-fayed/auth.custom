ALTER TABLE "user_oauth_accounts" ALTER COLUMN "provider" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."oauth_provides";--> statement-breakpoint
CREATE TYPE "public"."oauth_provides" AS ENUM('google');--> statement-breakpoint
ALTER TABLE "user_oauth_accounts" ALTER COLUMN "provider" SET DATA TYPE "public"."oauth_provides" USING "provider"::"public"."oauth_provides";