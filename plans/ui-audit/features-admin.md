# Admin Access UI + i18n

Goal: AR/EN translations and correct gating for admin-only page.

## Steps
- [x] Inventory admin page components and nav entry; note files.
- [x] Localize admin copy (title, buttons, errors) in EN/AR.
- [x] Confirm access control uses current-user session (no role/permission leftovers); ensure non-admin redirect path and message are correct.
- [x] UX polish: provide friendly denial message or redirect; AR direction.
- [x] Manual smoke: visit as non-admin (expect redirect/deny), visit as admin (page loads); record findings.
