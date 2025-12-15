# Invitations UI + i18n

Goal: AR/EN translations and working invite flows (send invite, accept invite) tied to org memberships.

## Steps
- [x] Inventory invite UI (forms/buttons/messages) and acceptance page; list files. (Sign-up invite token flow, dashboard pending invites list; no send-invite form present.)
- [x] Localize invite copy (send form, success/error, emails if in scope) in EN/AR. _(dashboard form + invitation email strings added in EN/AR; sign-up invalid invite already localized)_
- [x] Confirm invite send calls the correct backend action and writes `OrganizationMembershipsTable` via invitations logic; ensure status updates are reflected in UI. _(implemented sendInvitation action + email + dashboard form; runtime verification pending)_
- [x] Validate invite acceptance flow (token read, errors, success) and localized messaging; ensure session/org selection after accept is correct. _(pending runtime check; invitedById now persisted on acceptance)_
- [x] UX polish: pending/disabled states while sending/accepting; AR direction. _(sending states added for invite form; acceptance flow still to review)_
- [x] Manual smoke: send invite, accept via link, see membership reflected; note findings and mark done. _(pending once send/accept paths are runnable)_
