# Auth i18n Migration (remove `authMessage`)

## 1) Server actions & emails
Files to update (replace `authMessage` with server `t` from `getT`):
- src/auth/nextjs/actions.ts
- src/auth/nextjs/emailActions.ts
- src/auth/nextjs/org/actions.ts
- src/auth/nextjs/emails/emailVerification.ts
- src/auth/nextjs/emails/emailChangeVerification.ts
- src/auth/features/password/emails/passwordReset.ts
- src/auth/features/password/server/actions.ts
- (add any other server-only helpers that import `authMessage`)

## 2) Client auth components/forms
Files to update (use `useTranslation().t`):
- src/auth/nextjs/components/SignInForm.tsx
- src/auth/nextjs/components/SignUpForm.tsx
- src/auth/nextjs/components/ForgotPasswordForm.tsx
- src/auth/nextjs/components/ResetPasswordForm.tsx
- src/auth/nextjs/components/ProfileForm.tsx
- src/auth/nextjs/components/ChangeEmailForm.tsx
- src/auth/nextjs/components/OrganizationSwitcher.tsx
- src/auth/nextjs/components/OAuthConnectionControls.tsx
- src/auth/nextjs/components/RolePermissionsManager.tsx
- src/auth/nextjs/components/CreateOrganizationForm.tsx
- (any other client components importing `authMessage`)

## 3) Remove helper & exports
- Delete src/auth/config/messages.ts
- Update src/auth/config.ts to drop `authMessage`/`setAuthLocale` exports
- Ensure layout or other files no longer import `authMessage` helpers
- Run `npm run typecheck`

## 4) Align translation keys
- Add/migrate missing auth keys into:
  - src/lib/i18n/auth/en.ts
  - src/lib/i18n/auth/ar.ts
- Remove obsolete keys for removed features
- Ensure multiline/system features are separated by line breaks where relevant

## 5) Verify
- Run `npm run typecheck`
- Manually spot-check key flows (sign-in/up, password reset, email flows) for translated strings
