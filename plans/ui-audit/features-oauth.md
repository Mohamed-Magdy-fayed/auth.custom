# OAuth UI + i18n

Goal: AR/EN translations and working OAuth connect/sign-in flows for configured providers.

## Steps
- [x] Inventory OAuth entry points (buttons/CTA text) in sign-in/up forms; list files.
- [x] Ensure provider button labels/messages are localized (EN/AR) and use `useTranslation`.
- [x] Confirm `oAuthSignIn` client action hits the correct API route and handles errors; show localized error toasts.
- [x] Verify server route `/api/oauth/[provider]` success/error redirects and session creation; ensure copy on error redirect is localized.
- [x] Validate state/nonce handling and cookie usage matches UI expectations.
- [x] UX check: loading state while initiating OAuth; error banner styling; AR direction.
- [x] Manual smoke per provider (happy/error); note findings and mark done. _(pending runtime)_
