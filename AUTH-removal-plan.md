# Auth data model simplification plan

Goal: remove DB sessions and all team/role/permission tables/features; keep organizations + memberships so users can belong to multiple orgs. Retarget SaaS tables to orgs (no teams). Use cookie sessions from `auth` folder.

## Checklist

- [ ] Baseline
  - [ ] Create backup of current db/migrations if needed
  - [ ] Confirm env/local dev can be reset (drizzle migrations/seed)

- [ ] Schema changes (drizzle tables)
  - [ ] Delete tables: `auth_permissions`, `auth_roles`, `auth_role_permissions`, `auth_teams`, `auth_team_memberships`, `auth_user_role_assignments`, `auth_sessions`
  - [x] Remove their exports from `src/auth/tables/index.ts`
  - [x] Prune from `src/auth/tables/relations.ts` and any schema helpers
  - [x] Keep `auth_organizations` + `auth_organization_memberships`; drop roleId column from memberships if no roles
  - [x] Retarget SaaS tables (`activity-logs`, `invitations`) to reference orgs instead of teams; adjust FKs and schema
  - [x] Generate a new migration (or adjust existing) to drop columns/FKs/indexes accordingly

- [x] Auth/session layer
  - [x] Remove all code that queries `SessionsTable`; switch to cookie-session helpers from `auth/nextjs` and `auth/core/session` in the attached folder
  - [x] Remove session imports from API routes, actions, middleware; ensure middleware still sets locale and reads cookie session

- [ ] Org membership flow (keep)
  - [x] Simplify `auth/nextjs/org/actions.ts` to only: create org, delete org, set active org, add/remove membership, list memberships
  - [x] Drop all role/permission/team logic and related zod schemas in `org/schemas.ts`
  - [x] Update components using these actions: `CreateOrganizationForm`, `OrganizationSwitcher`, membership UI (if any)
  - [ ] Ensure membership selection (admin assigns user to org via select field) still works with the simplified API

- [x] Remove role/permission/team UI & logic
  - [x] Delete components/pages: `RolePermissionsManager`, team management UIs, any permission-driven controls
  - [x] Remove `auth/config/permissions.ts` and derived constants/types
  - [x] Remove `authorizationDefaults`, `org/types`, `org/access`, and related helpers
  - [x] Clean i18n strings under `org.*` that reference teams/roles/permissions; keep only org + membership strings needed
  - [x] Update docs (`data/docs-content.ts`) to reflect no roles/permissions/teams

- [x] OAuth/Passkeys/Other features
  - [x] Verify they do not import removed tables (roles/teams/permissions/sessions); adjust if they rely on sessions

- [ ] Drizzle/db plumbing
  - [x] Update `drizzle/schema.ts` if it re-exports removed tables
  - [x] Regenerate `drizzle-kit` migrations; run migration in dev

- [ ] Cleanup
  - [ ] Remove dead imports/exports after deletions
  - [x] Run `npm run typecheck`
  - [x] Run `npm run build` (optional) and a quick smoke of org create/set active
