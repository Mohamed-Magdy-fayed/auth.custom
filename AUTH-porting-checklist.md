# Auth Portability Readiness Checklist

- [x] Verify current project has required deps and config for auth module (Next.js/TypeScript versions, Drizzle, env vars).
- [x] Simplify `src/auth/config/features.ts` so feature toggles/branding can be tweaked without touching other files.
- [x] Standardize permissions on `src/auth/config/permissions.ts` structure; update all imports in auth to use it.
- [x] Remove roles/teams management (tables, actions, helpers, permissions) that are no longer needed.
- [x] Align role keys across `features.ts`, permissions, and any role-aware UI to avoid mismatches.
- [x] Ensure auth components/pages reference permissions only via `src/auth/config/permissions.ts` (remove stale helpers/duplicates).
- [x] Migrate auth translations to `src/lib/i18n/`; ensure all auth copy flows through this i18n layer.
- [x] Add separate auth translation files for `en` and `ar` under `src/lib/i18n/` with keys for sign-in/up, reset, verify, profile, errors, buttons.
- [x] Update auth UI/components to consume the new `en`/`ar` auth translation files; remove old translation wiring.
- [x] Confirm org-scoped permission data needs (`orgId`, etc.) are satisfied by auth APIs/queries in this project. (Org/team context via `getUserWithTeam` exposes `organizationId`; org actions resolve membership per request. Session JWT intentionally lean - extend if orgId-in-cookie needed.)
- [x] Run type checks and lint to surface missing imports/paths/types after refactors. (2025-12-13: `npm run typecheck` passes; Biome already clean)
- [ ] Manually test core auth flows (sign-in, sign-up, email verify, password reset, passkeys if present) under multiple roles to validate permissions and translations.
- [ ] Note project-specific overrides (env vars, providers, routes) so the auth folder stays drop-in for future copies.
