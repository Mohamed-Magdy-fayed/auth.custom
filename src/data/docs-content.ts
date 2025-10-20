export type DocArticle = {
    id: string;
    title: string;
    summary: string;
    category: string;
    tags: string[];
    body: string[];
    actions?: { label: string; href: string }[];
};

export const docsArticles: DocArticle[] = [
    {
        id: "getting-started",
        title: "Getting started with auth.custom",
        summary:
            "Create an account, confirm your email, and invite teammates in a single guided flow.",
        category: "Essentials",
        tags: ["signup", "onboarding", "teams"],
        body: [
            "Use the sign up button in the header to create a new workspace. The onboarding wizard walks through email verification, password selection, and first organization setup.",
            "You can skip email verification in development by using the console preview in /auth/nextjs/emails.",
            "Once inside the product, open the avatar menu to access workspace settings, members, and security preferences.",
        ],
        actions: [
            { label: "Launch the demo onboarding", href: "/sign-up" },
            { label: "Preview transactional emails", href: "/auth/nextjs/emails" },
        ],
    },
    {
        id: "password-auth",
        title: "Password-based authentication",
        summary:
            "Secure password storage with modern hashing, breach detection, and optional strength policies.",
        category: "Authentication",
        tags: ["passwords", "argon2", "breach"],
        body: [
            "Credentials are stored using Argon2id with per-user salts. Configuration lives in auth/config/features.ts.",
            "Users can rotate credentials from the profile screen. Breached password detection is enabled by default in development mode.",
            "Reset flows issue short-lived tokens stored in the user_tokens table, keeping the database as the ultimate source of truth.",
        ],
        actions: [
            { label: "Trigger a password reset", href: "/forgot-password" },
        ],
    },
    {
        id: "passkeys",
        title: "Passkeys and WebAuthn",
        summary:
            "Delight users with passwordless sign-in using passkeys, synced across devices via WebAuthn.",
        category: "Authentication",
        tags: ["passkeys", "webauthn", "security"],
        body: [
            "Enable the passkeys feature flag in auth/config/features.ts to expose registration and management UI.",
            "Users can register multiple authenticators. Each credential is scoped to the user and stored in biometric_credentials_table.",
            "Fallback to magic links or passwords is supported automatically, ensuring no lockouts.",
        ],
        actions: [
            { label: "Open the security settings", href: "/app" },
        ],
    },
    {
        id: "developer-integration",
        title: "Developer integration guide",
        summary:
            "Bring the entire auth stack into an existing Next.js app by copying a single folder and wiring two touchpoints.",
        category: "Developers",
        tags: ["quickstart", "integration", "nextjs"],
        body: [
            "Duplicate the src/auth folder into your project. It contains every server action, session helper, and UI shell the product uses.",
            "Point your middleware to auth/nextjs/sessionActions.ts so protected routes work instantly.",
            "Sync the drizzle schema by importing auth/tables/index.ts or running the included migrations before deploying.",
        ],
        actions: [
            { label: "Jump to setup checklist", href: "/docs#developer-guide" },
        ],
    },
    {
        id: "sessions",
        title: "Session lifecycle",
        summary:
            "Short-lived HTTP-only cookies backed by rotating session tokens keep accounts secure.",
        category: "Platform",
        tags: ["sessions", "cookies", "rotation"],
        body: [
            "Every login issues a server-managed session tied to the sessions_table. Tokens rotate on sensitive actions for defense in depth.",
            "Revoking a session invalidates the cookie instantly thanks to constant-time lookups and hashed secrets.",
            "The customer portal lists active devices and enables single-click sign out everywhere.",
        ],
        actions: [
            { label: "Inspect active sessions", href: "/app/sessions" },
        ],
    },
    {
        id: "organizations",
        title: "Organizations and roles",
        summary:
            "Multi-tenant workspaces, teams, and granular permissions come out of the box.",
        category: "Collaboration",
        tags: ["organizations", "teams", "rbac"],
        body: [
            "Each user can belong to multiple organizations. Switching context is instant via the avatar menu.",
            "Roles and permissions are defined in auth/config/permissions.ts and hydrated into the organization_memberships_table.",
            "Team owners can promote members, invite new teammates, and manage billing without admin intervention.",
        ],
        actions: [
            { label: "Invite a teammate", href: "/app" },
        ],
    },
    {
        id: "billing",
        title: "Billing and monetization",
        summary:
            "Stripe integration supports paid supporters while keeping the core tier generous and free.",
        category: "Monetization",
        tags: ["billing", "stripe", "pricing"],
        body: [
            "Configure Stripe credentials to enable one-click upgrades. Without keys, the app renders safe demo plans so you can test the journey.",
            "Maintain plans in the pricing UI. Supporters can manage billing via the dashboard's portal button.",
            "We encourage offering the entire feature set for free while letting fans sponsor the project with Plus memberships.",
        ],
        actions: [
            { label: "Explore pricing", href: "/pricing" },
        ],
    },
    {
        id: "email",
        title: "Transactional emails",
        summary:
            "Well-crafted email templates cover verification, invites, password resets, and security alerts.",
        category: "Communication",
        tags: ["email", "templates", "resend"],
        body: [
            "Replace the email transport in auth/nextjs/emailActions.ts to hook into your provider of choice.",
            "All templates live in auth/nextjs/emails and render with React Email. Preview them locally without sending real messages.",
            "Out-of-the-box rate limiting and token expiration keeps sensitive flows safe from abuse.",
        ],
        actions: [
            { label: "Preview email templates", href: "/auth/nextjs/emails" },
        ],
    },
];
