CREATE TYPE "public"."saas_activity_type" AS ENUM('SIGN_UP', 'SIGN_IN', 'SIGN_OUT', 'UPDATE_PASSWORD', 'DELETE_ACCOUNT', 'UPDATE_ACCOUNT', 'CREATE_TEAM', 'REMOVE_TEAM_MEMBER', 'INVITE_TEAM_MEMBER', 'ACCEPT_INVITATION');--> statement-breakpoint
CREATE TYPE "public"."saas_invitation_status" AS ENUM('pending', 'accepted', 'revoked');--> statement-breakpoint
CREATE TABLE "saas_activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" uuid,
	"action" "saas_activity_type" NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text
);
--> statement-breakpoint
CREATE TABLE "saas_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"team_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role_key" text NOT NULL,
	"invited_by_user_id" uuid,
	"status" "saas_invitation_status" DEFAULT 'pending' NOT NULL,
	"token" text NOT NULL,
	"accepted_at" timestamp with time zone,
	CONSTRAINT "saas_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
DROP INDEX "auth_sessions_user_idx";--> statement-breakpoint
DROP INDEX "auth_sessions_status_idx";--> statement-breakpoint
ALTER TABLE "auth_teams" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "auth_teams" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "auth_teams" ADD COLUMN "stripe_product_id" text;--> statement-breakpoint
ALTER TABLE "auth_teams" ADD COLUMN "plan_name" text;--> statement-breakpoint
ALTER TABLE "auth_teams" ADD COLUMN "subscription_status" text;--> statement-breakpoint
ALTER TABLE "saas_activity_logs" ADD CONSTRAINT "saas_activity_logs_team_id_auth_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."auth_teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saas_activity_logs" ADD CONSTRAINT "saas_activity_logs_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saas_invitations" ADD CONSTRAINT "saas_invitations_team_id_auth_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."auth_teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saas_invitations" ADD CONSTRAINT "saas_invitations_invited_by_user_id_auth_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_teams" ADD CONSTRAINT "auth_teams_stripe_customer_id_unique" UNIQUE("stripe_customer_id");--> statement-breakpoint
ALTER TABLE "auth_teams" ADD CONSTRAINT "auth_teams_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id");