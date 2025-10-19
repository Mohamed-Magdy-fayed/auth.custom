# Custom Next.js Authentication

An opinionated authentication module for Next.js 15 featuring localized UI, modular Drizzle tables, OTP-based password resets, and email verification out of the box.

## Features

- Modular Postgres schema in `src/auth/tables` (users, sessions, tokens, organizations, teams, permissions, biometrics)
- OTP password reset flow with 6-digit codes, automated session revocation, and localized messaging
- Email change + verification pipeline with reusable token handling and Nodemailer delivery
- Role and organization management UI with localized components and mock translation bootstrapper
- Minimal dependency footprint (React, Next.js, Drizzle ORM, Nodemailer, input-otp) with Tailwind UI primitives

## Prerequisites

- Node.js 20+
- PostgreSQL 14+ (a local instance or Docker)
- SMTP credentials for password-reset and verification emails

## Setup & Configuration

1. **Install dependencies**

	```bash
	npm install
	```

2. **Create environment variables** – create a `.env.local` file (or export variables) matching the schema in `src/data/env/server.ts`:

	```bash
	# Database
	DB_HOST=localhost
	DB_USER=postgres
	DB_PASSWORD=postgres
	DB_NAME=auth_app

	# JWT + OAuth
	JWT_SECRET_KEY="replace-with-32-char-secret"
	OAUTH_REDIRECT_URL_BASE=http://localhost:3000
	GOOGLE_CLIENT_ID=...
	GOOGLE_CLIENT_SECRET=...

	# Outbound email
	COMMS_EMAIL=notifications@example.com
	COMMS_EMAIL_PASS="smtp-password"
	COMMS_EMAIL_HOST=smtp.example.com
	COMMS_EMAIL_PORT=587
	```

	Optional providers (GitHub, Microsoft, Apple) can also be supplied; leave them unset if unused.

3. **Run database migrations**

	```bash
	npm run db:migrate
	```

4. **Start the application**

	```bash
	npm run dev
	```

	Visit `http://localhost:3000` to access the demo flows.

## Password Reset Workflow (OTP)

1. Navigate to `/forgot-password` and submit the account email.
2. An email containing a 6-digit verification code (valid for 10 minutes) is sent via Nodemailer.
3. Open `/reset-password`, supply the email, code, and a new password.
4. Upon success, all existing sessions are revoked and the user may sign in with the new password.

The flow is driven by `src/auth/nextjs/passwordResetActions.ts`, `ForgotPasswordForm`, and `ResetPasswordForm`, using the `input-otp` UI component for code entry.

## Email Verification & Change

- **Send verification**: the profile email card surfaces a “Send verification email” button when the account is unverified (`EmailVerificationNotice`).
- **Change email**: submitting the change form issues a verification link to the new address. The link finalizes the change on `/verify-email`.
- Tokens share the `auth_user_tokens` table with granular metadata for both change and verify operations.

## Localization

- UI strings are retrieved through `authMessage` with keys registered in `src/auth/mockTranslations.ts`.
- `registerMockAuthTranslations()` provides a development translator (see `src/app/layout.tsx`). Replace it with a real translation adapter for production.

## Database Layout

- All authentication tables live under `src/auth/tables` and are exported via `index.ts`.
- Session metadata (`auth_sessions`) tracks device info, expiration, and revocation history.
- Biometric credentials (`auth_biometric_credentials`) are scaffolded for future WebAuthn support.

## Roles & Permissions

- Role and permission tables (`roles`, `role_permissions`, `user_role_assignments`) enable global and organization-scoped access control.
- UI helpers in `OrganizationSection` and `TeamMembersManager` demonstrate role toggling and team management.

## Biometrics & Permissions Roadmap

- `auth_biometric_credentials` stores credential IDs, counters, and verification flags for WebAuthn/passkey support. Next steps: implement registration and assertion routes plus client-side WebAuthn UX.
- Permission management currently exposes core tables and server helpers; extend with dedicated admin tooling (CRUD for roles/permissions and assignment workflows) as needed.

## Dependency Footprint

- Runtime: `next`, `react`, `drizzle-orm`, `pg`, `nodemailer`, `input-otp`, `react-hook-form`, `zod`
- UI utilities: `clsx`, `tailwind-merge`, Radix primitives, ShadCN components
- Dev tooling: `typescript`, `vitest`, `eslint`, `drizzle-kit`

Remove unused OAuth providers or UI helpers to slim the install; the auth core only depends on the packages listed above.
