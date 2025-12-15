CREATE TYPE "public"."auth_org_membership_status" AS ENUM('pending', 'active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."auth_oauth_provider" AS ENUM('google', 'github', 'microsoft', 'apple');--> statement-breakpoint
CREATE TYPE "public"."auth_user_token_type" AS ENUM('email_verification', 'password_reset', 'magic_link', 'otp', 'device_trust');--> statement-breakpoint
CREATE TYPE "public"."auth_user_status" AS ENUM('active', 'invited', 'inactive', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."saas_activity_type" AS ENUM('SIGN_UP', 'SIGN_IN', 'SIGN_OUT', 'UPDATE_PASSWORD', 'DELETE_ACCOUNT', 'UPDATE_ACCOUNT', 'CREATE_TEAM', 'REMOVE_TEAM_MEMBER', 'INVITE_TEAM_MEMBER', 'ACCEPT_INVITATION');--> statement-breakpoint
CREATE TYPE "public"."saas_invitation_status" AS ENUM('pending', 'accepted', 'revoked');--> statement-breakpoint
CREATE TABLE "auth_biometric_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"credentialId" text NOT NULL,
	"publicKey" text NOT NULL,
	"label" text,
	"transports" jsonb,
	"signCount" bigint DEFAULT 0 NOT NULL,
	"aaguid" text,
	"isBackupEligible" boolean DEFAULT false NOT NULL,
	"isBackupState" boolean DEFAULT false NOT NULL,
	"isUserVerified" boolean DEFAULT false NOT NULL,
	"lastUsedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_organization_memberships" (
	"organizationId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"status" "auth_org_membership_status" DEFAULT 'pending' NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"invitedById" uuid,
	"joinedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_organization_memberships_organizationId_userId_pk" PRIMARY KEY("organizationId","userId")
);
--> statement-breakpoint
CREATE TABLE "auth_organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"metadata" jsonb,
	"createdById" uuid,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "auth_user_credentials" (
	"user_id" uuid NOT NULL,
	"passwordHash" text NOT NULL,
	"passwordSalt" text NOT NULL,
	"expiresAt" timestamp with time zone,
	"mustChangePassword" boolean DEFAULT false NOT NULL,
	"lastChangedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_user_oauth_accounts" (
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"provider" "auth_oauth_provider" NOT NULL,
	"providerAccountId" text NOT NULL,
	"displayName" text,
	"profileUrl" text,
	"accessToken" text,
	"refreshToken" text,
	"scopes" jsonb,
	"expiresAt" timestamp with time zone,
	CONSTRAINT "auth_user_oauth_accounts_providerAccountId_provider_pk" PRIMARY KEY("providerAccountId","provider")
);
--> statement-breakpoint
CREATE TABLE "auth_user_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tokenHash" text NOT NULL,
	"type" "auth_user_token_type" NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"consumedAt" timestamp with time zone,
	"metadata" jsonb DEFAULT 'null'::jsonb,
	CONSTRAINT "auth_user_tokens_tokenHash_unique" UNIQUE("tokenHash")
);
--> statement-breakpoint
CREATE TABLE "auth_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"email_normalized" text NOT NULL,
	"display_name" text,
	"name" text,
	"given_name" text,
	"family_name" text,
	"avatar_url" text,
	"locale" text,
	"timezone" text,
	"status" "auth_user_status" DEFAULT 'active' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"last_sign_in_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saas_activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" uuid NOT NULL,
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
	"organization_id" uuid NOT NULL,
	"email" text NOT NULL,
	"invited_by_user_id" uuid,
	"status" "saas_invitation_status" DEFAULT 'pending' NOT NULL,
	"token" text NOT NULL,
	"accepted_at" timestamp with time zone,
	CONSTRAINT "saas_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "auth_biometric_credentials" ADD CONSTRAINT "auth_biometric_credentials_userId_auth_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_organization_memberships" ADD CONSTRAINT "org_memberships_org_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."auth_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_organization_memberships" ADD CONSTRAINT "org_memberships_user_fk" FOREIGN KEY ("userId") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_organization_memberships" ADD CONSTRAINT "org_memberships_inviter_fk" FOREIGN KEY ("invitedById") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_organizations" ADD CONSTRAINT "auth_organizations_createdById_auth_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_user_tokens" ADD CONSTRAINT "auth_user_tokens_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saas_activity_logs" ADD CONSTRAINT "saas_activity_logs_organization_id_auth_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."auth_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saas_activity_logs" ADD CONSTRAINT "saas_activity_logs_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saas_invitations" ADD CONSTRAINT "saas_invitations_organization_id_auth_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."auth_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saas_invitations" ADD CONSTRAINT "saas_invitations_invited_by_user_id_auth_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_users_email_normalized_unique" ON "auth_users" USING btree ("email_normalized");