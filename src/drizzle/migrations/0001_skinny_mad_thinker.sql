ALTER TABLE "auth_teams" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_teams" ADD CONSTRAINT "auth_teams_slug_unique" UNIQUE("slug");