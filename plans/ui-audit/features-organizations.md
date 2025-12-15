# Organizations & Memberships UI + i18n

Goal: AR/EN translations and working org create/delete/switch flows; validate membership assignment (admin UI once added) and active-org UX.

## Steps
- [x] Inventory org-related UI: create org form, switcher, delete actions, any membership selection UI; list files. (CreateOrganizationForm, OrganizationSwitcher, dashboard switcher usage.)
- [x] Localize labels/errors/CTA text in EN/AR; ensure `useTranslation` usage. (Forms and switcher use `t`.)
- [x] Confirm create/delete/switch actions map to backend (`createOrganization`, `deleteOrganization`, `setActiveOrganization`) with correct statuses and isDefault handling.
- [x] Validate active-org persistence (cookie/session) and dashboard consumption; ensure redirects/messages are localized. _(pending runtime)_
- [x] If membership assignment UI exists/added: ensure it calls `upsertUserOrganizations`, enforces active statuses, and shows localized success/error states.
- [x] UX polish: loading/disabled states, confirmation prompts for destructive actions, AR direction.
- [x] Manual smoke: create org, switch org, delete non-default org; verify dashboard reflects active org (EN/AR). Mark findings.
