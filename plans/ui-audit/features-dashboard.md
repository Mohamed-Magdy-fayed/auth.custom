# Dashboard UI + i18n

Goal: AR/EN translations and working dashboard overview tied to active org/membership.

## Steps
- [x] Inventory dashboard components (cards, stats, notices) and note files. _(Dashboard page: src/app/dashboard/page.tsx; data helpers: src/saas/db/queries.ts; components: OrganizationSwitcher)_
- [x] Localize all text (EN/AR) with server `getT` (and locale-aware formatting) for this page; no hard-coded strings. _(Page uses getT; all labels/empty states from dashboardPage keys)_
- [x] Confirm data sourcing uses active org context and correct backend queries; remove stale role/team dependencies. _(Uses getUserWithOrganization active/default membership; stats/members/invites/activity fetched per org)_
- [x] UX polish: empty states, loading indicators, AR direction. _(added dir/lang on dashboard root for RTL/locale correctness; server-rendered cards already include empty states)_
- [x] Manual smoke: load dashboard with active org, switch org and verify update; record findings.
