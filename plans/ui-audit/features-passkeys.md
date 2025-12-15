# Passkeys UI + i18n

Goal: AR/EN translations and working passkey registration/login UX hooked to backend actions.

## Steps
- [ ] Inventory passkey UI surfaces (manager, CTA buttons on sign-in) and note files.
- [ ] Localize all prompts/errors/success messages in EN/AR; ensure `useTranslation` coverage.
- [ ] Confirm `beginPasskey*` and `completePasskey*` flows are wired to server actions with correct parameters and error handling.
- [ ] Validate WebAuthn browser checks (feature detection, abort handling) and loading states; adjust for better UX if needed.
- [ ] Ensure session creation post-passkey auth works and redirects correctly.
- [ ] Manual smoke: register, sign out, sign in via passkey (EN/AR); capture issues, mark steps done.
