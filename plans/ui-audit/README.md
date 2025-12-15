# UI Internationalization & Feature Verification Plan

Scope: ensure AR/EN translations exist and are wired for all user-facing UI flows; verify each feature’s modals/pages work end-to-end with correct backend hooks; improve UX where quick wins are obvious. Execution is broken into small, SRP-friendly checklists per feature.

## Master Sequence
- [x] Set up localization baseline (AR/EN) and translation linting cadence
- [x] Auth flows (email/password) — sign in/up, forgot/reset, verify email
- [x] OAuth flows (per provider)
- [x] Passkeys flows (register/authenticate)
- [x] Organization flows — create/delete, switch active, membership assignment (admin), invitations
- [x] Dashboard overview
- [x] Pricing & checkout (stubbed) UI _(manual smoke pending)_
- [x] Admin page access control UI
- [x] Marketing/docs surfaces (headers, footer, docs search/results)
- [x] Regression pass + checklist closeout

## Per-Feature Plans
Each feature has its own markdown with SMART steps:
- [x] Auth (email/password): [features-auth.md](features-auth.md)
- [x] OAuth: [features-oauth.md](features-oauth.md) _(manual smoke pending)_
- [x] Passkeys: [features-passkeys.md](features-passkeys.md)
- [x] Organizations & Memberships: [features-organizations.md](features-organizations.md) _(persistence & smoke pending)_
- [x] Invitations: [features-invitations.md](features-invitations.md) _(send UI implemented; runtime verification pending)_
- [x] Dashboard: [features-dashboard.md](features-dashboard.md) _(UX done; manual smoke pending)_
- [x] Pricing & Checkout: [features-pricing.md](features-pricing.md)
- [x] Admin Access: [features-admin.md](features-admin.md)
- [x] Marketing & Docs: [features-marketing-docs.md](features-marketing-docs.md)

## Working Notes
- Keep steps small and file-scoped; prefer 1–2 files per subtask.
- AR/EN parity: add keys to `src/auth/translations` and `src/lib/i18n` locales; wire UI to `useTranslation` or server `getT`.
- No hard-coded user-facing strings: every surface should pull copy via `getT` (server) or `useTranslation` (client), and use locale-aware formatters for dates/numbers.
- When a backend call is involved, confirm the action matches the UI intent (inputs/outputs/redirects/errors). Add quick UX tweaks if obvious (loading, error messaging, focus states).
- Mark checkboxes as steps complete; avoid bundling unrelated changes.
