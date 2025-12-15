# Auth (Email/Password) UI + i18n

Goal: AR/EN translations and fully working flows for sign-in, sign-up, forgot/reset password, verify email. Confirm UI hooks to actions and UX is solid.

## Steps
- [x] Inventory screens: sign-in, sign-up, forgot-password, reset-password, verify-email pages/components; note files.
- [x] Ensure translation keys exist (EN/AR) for labels, errors, CTA text; add missing keys in locale files; wire components to `useTranslation`/`getT`.
- [x] Sign-in UI: validate schema alignment, error handling, loading states; ensure `signIn` action is called with redirect/priceId handling; AR layout direction check.
- [x] Sign-up UI: validate invitation token handling, password rules, redirects; ensure session creation and org provisioning occur; AR/EN text. Added disabled submit + loading label.
- [x] Forgot/Reset: confirm tokens sent/consumed; form validation messages localized; disable-submit while pending.
- [x] Verify email page: ensure status messaging and CTA hooks to backend; localized.
- [x] Cross-check middleware locale handling and auth redirects for both languages (cookie-based locale, dir set in layout; middleware only guards routes, no locale breakage).
- [x] Quick UX polish (focus order, aria labels where missing, consistent button variants). Added aria-live roles on all auth status messages.
- [ ] Manual smoke (pending runtime): run EN/AR happy paths + common errors; capture follow-ups.
	- EN happy paths: sign-up (with/without redirect), sign-in (redirect + priceId), forgot/reset, verify-email.
	- AR happy paths: same as above with locale switch; confirm RTL layout and strings.
	- Error paths: bad credentials, expired/invalid reset code, reused reset code, invalid verify token, passkey cancel/abort.
	- Checks: buttons disabled while submitting, aria-live messages read, redirect param preserved, session landed at /app.
	- Record any UI text mismatches or missing translations per page.
- [ ] Update plan checkboxes and log findings/fixes.
