CREATE TYPE "public"."auth_org_membership_status" AS ENUM('pending', 'active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."auth_role_scope" AS ENUM('system', 'organization', 'team');--> statement-breakpoint
CREATE TYPE "public"."auth_session_status" AS ENUM('active', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."auth_team_membership_status" AS ENUM('pending', 'active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."auth_oauth_provider" AS ENUM('google', 'github', 'microsoft', 'apple');--> statement-breakpoint
CREATE TYPE "public"."auth_user_token_type" AS ENUM('email_verification', 'password_reset', 'magic_link', 'otp', 'device_trust');--> statement-breakpoint
CREATE TYPE "public"."auth_user_status" AS ENUM('active', 'invited', 'inactive', 'suspended');--> statement-breakpoint
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
	"roleId" uuid,
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
CREATE TABLE "auth_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_role_permissions" (
	"roleId" uuid NOT NULL,
	"permissionId" uuid NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_role_permissions_roleId_permissionId_pk" PRIMARY KEY("roleId","permissionId")
);
--> statement-breakpoint
CREATE TABLE "auth_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"scope" "auth_role_scope" DEFAULT 'system' NOT NULL,
	"organization_id" uuid,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_token_hash" text NOT NULL,
	"refresh_token_hash" text,
	"status" "auth_session_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by" uuid,
	"ip_address" text,
	"user_agent" text,
	"device" text,
	"platform" text,
	"country" text,
	"city" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_team_memberships" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"teamId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"roleId" uuid,
	"customTitle" text,
	"status" "auth_team_membership_status" DEFAULT 'pending' NOT NULL,
	"isManager" boolean DEFAULT false NOT NULL,
	"joinedAt" timestamp with time zone,
	CONSTRAINT "auth_team_memberships_teamId_userId_pk" PRIMARY KEY("teamId","userId")
);
--> statement-breakpoint
CREATE TABLE "auth_teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organizationId" uuid NOT NULL,
	"parentTeamId" uuid,
	"name" text NOT NULL,
	"description" text
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
CREATE TABLE "auth_user_role_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"roleId" uuid NOT NULL,
	"organizationId" uuid,
	"teamId" uuid,
	"assignedById" uuid,
	"assignedAt" timestamp with time zone DEFAULT now() NOT NULL
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
ALTER TABLE "auth_biometric_credentials" ADD CONSTRAINT "auth_biometric_credentials_userId_auth_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_organization_memberships" ADD CONSTRAINT "org_memberships_org_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."auth_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_organization_memberships" ADD CONSTRAINT "org_memberships_user_fk" FOREIGN KEY ("userId") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_organization_memberships" ADD CONSTRAINT "org_memberships_role_fk" FOREIGN KEY ("roleId") REFERENCES "public"."auth_roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_organization_memberships" ADD CONSTRAINT "org_memberships_inviter_fk" FOREIGN KEY ("invitedById") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_organizations" ADD CONSTRAINT "auth_organizations_createdById_auth_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_role_permissions" ADD CONSTRAINT "auth_role_permissions_roleId_auth_roles_id_fk" FOREIGN KEY ("roleId") REFERENCES "public"."auth_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_role_permissions" ADD CONSTRAINT "auth_role_permissions_permissionId_auth_permissions_id_fk" FOREIGN KEY ("permissionId") REFERENCES "public"."auth_permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_roles" ADD CONSTRAINT "auth_roles_organization_id_auth_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."auth_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_revoked_by_auth_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_team_memberships" ADD CONSTRAINT "auth_team_memberships_teamId_auth_teams_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."auth_teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_team_memberships" ADD CONSTRAINT "auth_team_memberships_userId_auth_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_team_memberships" ADD CONSTRAINT "auth_team_memberships_roleId_auth_roles_id_fk" FOREIGN KEY ("roleId") REFERENCES "public"."auth_roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_teams" ADD CONSTRAINT "auth_teams_organizationId_auth_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."auth_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_user_oauth_accounts" ADD CONSTRAINT "auth_user_oauth_accounts_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_user_role_assignments" ADD CONSTRAINT "auth_user_role_assignments_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_user_role_assignments" ADD CONSTRAINT "user_role_assignments_role_fk" FOREIGN KEY ("roleId") REFERENCES "public"."auth_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_user_role_assignments" ADD CONSTRAINT "user_role_assignments_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_user_role_assignments" ADD CONSTRAINT "user_role_assignments_org_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."auth_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_user_role_assignments" ADD CONSTRAINT "user_role_assignments_team_fk" FOREIGN KEY ("teamId") REFERENCES "public"."auth_teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_user_role_assignments" ADD CONSTRAINT "user_role_assignments_assigned_by_fk" FOREIGN KEY ("assignedById") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_user_tokens" ADD CONSTRAINT "auth_user_tokens_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_roles_key_organization_unique" ON "auth_roles" USING btree ("organization_id","key");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_status_idx" ON "auth_sessions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_user_role_assignments_unique" ON "auth_user_role_assignments" USING btree ("user_id","roleId","organizationId","teamId");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_users_email_normalized_unique" ON "auth_users" USING btree ("email_normalized");