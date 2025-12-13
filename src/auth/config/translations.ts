type TranslationDictionary = Record<string, string>;

type TranslationConfig = {
	defaultLocale: string;
	messages: Record<string, TranslationDictionary>;
};

const translationConfig: TranslationConfig = {
	defaultLocale: "en",
	messages: {
		en: {
			"emails.common.defaultRecipientName": "there",
			"emails.common.fromName": "Gateling Auth",
			"emails.common.greetingHtml": "Hi {name},",
			"emails.common.minutePlural": "minutes",
			"emails.common.minuteSingular": "minute",
			"emails.common.signatureHtml": "Thanks,<br/>The Gateling Team",
			"passkeys.rpName": "Gateling Auth",
			"emails.emailChangeVerification.ctaLabel": "Confirm email change",
			"emails.emailChangeVerification.html.ignore":
				"If you didn't request this change, you can ignore this email and continue using your current address.",
			"emails.emailChangeVerification.html.intro":
				"We received a request to change the email on your Gateling account from <strong>{currentEmail}</strong> to <strong>{newEmail}</strong>.",
			"emails.emailChangeVerification.subject": "Confirm your new email address",
			"emails.emailChangeVerification.text":
				"Hi {name},\n\nWe received a request to change the email on your Gateling account from {currentEmail} to {newEmail}. Confirm this change by visiting the link below:\n\n{verificationUrl}\n\nIf you didn't request this change, you can ignore this email and keep your current address.",
			"emails.emailVerification.ctaLabel": "Verify email address",
			"emails.emailVerification.html.ignore":
				"If you did not create an account or request verification, you can ignore this message.",
			"emails.emailVerification.html.intro":
				"Confirm your email address by clicking the button below. The link expires in {expiryHours} hours.",
			"emails.emailVerification.subject": "Verify your email address",
			"emails.emailVerification.text":
				"Hi {name},\n\nConfirm your email address by visiting the link below. The link expires in {expiryHours} hours.\n\n{verificationUrl}\n\nIf you did not create an account or request verification, you can ignore this message.",
			"emails.passwordReset.html.ignore":
				"If you did not request this change, you can safely ignore this email.",
			"emails.passwordReset.html.intro":
				"We received a request to reset your password. Use the verification code below in the reset form. The code expires in {expiresIn} {minutesLabel}.",
			"emails.passwordReset.subject": "Your password reset code",
			"emails.passwordReset.text":
				"Hi {name},\n\nWe received a request to reset your password. Enter the verification code below in the reset form. The code expires in {expiresIn} {minutesLabel}.\n\n{code}\n\nIf you did not request this change, you can safely ignore this email.",
			"org.section.memberCount": "{count} {label}",
			"org.section.memberPlural": "members",
			"org.section.memberSingular": "member",
			"org.section.activeOrgPrefix": "Active organization",
			"org.section.addMemberDescription":
				"Invite an existing account into one of your teams by email.",
			"org.section.addMemberTitle": "Add someone to a team",
			"org.section.createOrgDescription":
				"Spin up a fresh workspace for a new group or initiative.",
			"org.section.createOrgTitle": "Create a new organization",
			"org.section.createTeamDescription":
				"Organize people into focused groups under this organization.",
			"org.section.createTeamOwnerOnly":
				"Only organization owners can create teams.",
			"org.section.createTeamTitle": "Create a team",
			"org.section.getStartedDescription":
				"Create your first organization to unlock team management tools.",
			"org.section.getStartedTitle": "Get started",
			"org.section.inviteNoPermission":
				"Only organization owners or team managers can invite members",
			"org.section.inviteNoTeams": "Create a team first",
			"org.section.managerBadge": "Manager",
			"org.section.teamCount": "{count} {label}",
			"org.section.teamPlural": "teams",
			"org.section.teamSingular": "team",
			"org.section.teamMembersDescription":
				"Review and remove members from your teams.",
			"org.section.teamMembersTitle": "Team members",
			"org.section.teamsHeading": "Teams",
			"org.section.yourOrganizationsDescription":
				"Switch between the organizations you belong to and review their details.",
			"org.section.yourOrganizationsTitle": "Your organizations",
			"org.section.noTeams": "No teams yet. Create one to start grouping members.",
			"org.section.ownerBadge": "Owner access",
			"org.section.slugLabel": "Slug",
			"selectField.clearFilter": "Clear {title} filter",
			"selectField.fallbackFilterTitle": "selection",
			"selectField.noResults": "No results found",
			"selectField.selectedCount": "{count} selected",
			"org.create.descriptionLabel": "Description",
			"org.create.descriptionPlaceholder": "Optional description",
			"org.create.nameLabel": "Organization name",
			"org.create.namePlaceholder": "Acme Inc.",
			"org.create.submit": "Create organization",
			"org.create.submitting": "Creating...",
			"org.switcher.activeBadge": "Active",
			"org.switcher.current": "Current",
			"org.switcher.empty": "No organizations yet.",
			"org.switcher.setActive": "Set active",
			"org.switcher.slugLabel": "Slug:",
			"org.switcher.switching": "Switching...",
			"org.actions.authorization.sync.success": "Authorization defaults synced",
			"org.actions.common.noOrgAccess":
				"You do not have access to that organization",
			"org.actions.createOrganization.error": "Unable to create organization",
			"org.actions.createOrganization.success": "Organization created",
			"org.actions.deleteOrganization.ownerOnly":
				"Only organization owners can delete the organization",
			"org.actions.deleteOrganization.success": "Organization deleted",
			"org.actions.members.activeOnly": "Only active members can be updated",
			"org.actions.members.add.existing":
				"Existing account found and added to the team",
			"org.actions.members.add.invited":
				"Member invited. Verification email sent to {email}.",
			"org.actions.members.add.success": "Member added to team",
			"org.actions.members.add.tempPassword":
				"Member added. Share this temporary password with them: {password}",
			"org.actions.members.createUserError":
				"Unable to create a new user for that email",
			"org.actions.members.invalidTeamRole":
				"Selected role is not valid for this team",
			"org.actions.members.manager.promoted": "Member promoted to manager",
			"org.actions.members.manager.removed": "Manager role removed",
			"org.actions.members.noAccount": "No account found for that email",
			"org.actions.members.notFoundOnTeam": "Member not found on that team",
			"org.actions.members.ownerOrManagerRequired":
				"You need to be an organization owner or team manager",
			"org.actions.members.remove.success": "Member removed",
			"org.actions.members.role.cleared": "Member role cleared",
			"org.actions.members.role.updated": "Member role updated",
			"org.actions.membership.notMember": "You do not belong to that organization",
			"org.actions.roles.create.error": "Unable to create role",
			"org.actions.roles.create.success": "Role created",
			"org.actions.roles.default.success": "Default role updated",
			"org.actions.roles.delete.assignments":
				"Remove or reassign members before deleting this role",
			"org.actions.roles.delete.defaultUnset":
				"Unset the default role before deleting it",
			"org.actions.roles.delete.ownerRole": "The owner role cannot be deleted",
			"org.actions.roles.delete.success": "Role deleted",
			"org.actions.roles.notFound": "Role not found",
			"org.actions.roles.ownerOnly": "Only organization owners can manage roles",
			"org.actions.roles.permissions.success": "Role permissions updated",
			"org.actions.roles.update.success": "Role updated",
			"org.actions.search.invalidInput": "Invalid search input",
			"org.actions.setActiveOrganization.success": "Organization selected",
			"org.actions.teams.create.error": "Unable to create team",
			"org.actions.teams.create.success": "Team created",
			"org.actions.teams.notFound": "Team not found",
			"org.actions.teams.ownerOnly": "Only organization owners can create teams",
			"org.status.active": "Active",
			"org.status.inactive": "Inactive",
			"org.status.pending": "Pending",
			"teams.members.addButton": "Add",
			"teams.members.adding": "Adding...",
			"teams.members.emailLabel": "Email",
			"teams.members.emailPlaceholder": "Email",
			"teams.members.assignRole": "Assign role",
			"teams.members.defaultRole": "Default",
			"teams.members.empty": "No members in this team yet.",
			"teams.members.loadError": "Unable to load team members",
			"teams.members.loading": "Loading members...",
			"teams.members.makeManager": "Make manager",
			"teams.members.manager": "Manager",
			"teams.members.managerError": "Unable to update manager status",
			"teams.members.managerNotAllowed":
				"You cannot update manager status on that team",
			"teams.members.manageNotAllowed": "You cannot manage members on that team",
			"teams.members.noRole": "No role",
			"teams.members.noTeam": "Create a team first",
			"teams.members.noTeamSelected": "Select a team",
			"teams.members.noTeamsMessage": "Create a team to start managing members.",
			"teams.members.readOnlyMessage":
				"You can view members, but only organization owners or team managers can make changes.",
			"teams.members.refresh": "Refresh",
			"teams.members.roleLabel": "Team role",
			"teams.members.rolePlaceholder": "Assign role",
			"teams.members.roleError": "Unable to update member role",
			"teams.members.roleNotAllowed": "You cannot update roles on that team",
			"teams.members.selectTeamFirst": "Select a team to search for members",
			"teams.members.selectLabel": "Select a team",
			"teams.members.submit": "Add member",
			"teams.members.teamLabel": "Team",
			"teams.members.teamSelectTitle": "Teams",
			"teams.members.status.active": "Active",
			"teams.members.status.inactive": "Inactive",
			"teams.members.status.invited": "Invited",
			"teams.members.status.suspended": "Suspended",
			"teams.members.unnamed": "Unnamed user",
			"teams.members.updatingManager": "Updating...",
			"teams.members.updatingRole": "Updating...",
			"teams.members.removing": "Removing...",
			"teams.members.remove": "Remove",
			"teams.members.removeManager": "Remove manager",
			"teams.members.removeError": "Unable to remove member",
			"teams.create.descriptionLabel": "Description",
			"teams.create.descriptionPlaceholder": "Optional description",
			"teams.create.nameLabel": "Team name",
			"teams.create.namePlaceholder": "Growth",
			"teams.create.parentLabel": "Parent team",
			"teams.create.parentTitle": "Teams",
			"teams.create.submit": "Create team",
			"teams.create.submitting": "Creating...",
			"teams.permissions.assignmentCount": "{count} assignments",
			"teams.permissions.default": "Default",
			"teams.permissions.empty": "Create a role before assigning permissions.",
			"teams.permissions.groupHelper": "Toggle capabilities for this role.",
			"teams.permissions.locked": "Locked",
			"teams.permissions.lockedMessage":
				"This role is managed by the system and cannot be edited.",
			"teams.permissions.readOnly":
				"You can review permissions, but only organization owners can make changes.",
			"teams.permissions.refreshError": "Unable to refresh permission data.",
			"teams.permissions.reset": "Reset",
			"teams.permissions.save": "Save changes",
			"teams.permissions.saving": "Saving...",
			"teams.permissions.scopeOrg": "Organization role",
			"teams.permissions.scopeTeam": "Team role",
			"teams.permissions.selectRole": "Select a role to view its permissions.",
			"teams.permissions.subtitle":
				"Select a role to review or adjust its permissions.",
			"teams.permissions.title": "Permissions",
			"teams.permissions.updated": "Permissions updated.",
			"actions.cancel": "Cancel",
			"actions.delete": "Delete",
			"actions.edit": "Edit",
			"teams.roles.assignments": "{count} assignments",
			"teams.roles.create": "Create role",
			"teams.roles.creating": "Creating...",
			"teams.roles.default": "Default role",
			"teams.roles.defaultUpdated": "Default role updated.",
			"teams.roles.deleteConfirm":
				"Delete this role? Make sure no members rely on it first.",
			"teams.roles.deleteDisabled":
				"Remove assignments before deleting this role.",
			"teams.roles.deleted": "Role deleted.",
			"teams.roles.description": "Description",
			"teams.roles.description.placeholder":
				"Optional details to help teammates understand this role.",
			"teams.roles.locked": "System role",
			"teams.roles.makeDefault": "Make default",
			"teams.roles.name": "Role name",
			"teams.roles.name.placeholderCreate": "Support specialist",
			"teams.roles.name.placeholderEdit": "Updated role name",
			"teams.roles.newOrganizationRole": "New organization role",
			"teams.roles.newTeamRole": "New team role",
			"teams.roles.noOrganization":
				"Select an organization before managing roles.",
			"teams.roles.organization": "Organization roles",
			"teams.roles.organization.empty": "No organization roles yet.",
			"teams.roles.readOnly":
				"You can review roles, but only organization owners can modify them.",
			"teams.roles.refreshError": "Unable to refresh roles. Please try again.",
			"teams.roles.subtitle":
				"Define reusable access levels for your organization and teams.",
			"teams.roles.team": "Team roles",
			"teams.roles.team.empty":
				"Create a team role to customize team-level permissions.",
			"teams.roles.title": "Workspace roles",
			"teams.roles.update": "Save changes",
			"teams.roles.updating": "Saving...",
			"teams.structure.empty": "No teams yet. Create one to get started.",
			"teams.structure.existing": "Existing teams",
			"teams.structure.manageable": "You manage this team",
			"teams.structure.memberCount": "{count} members",
			"teams.structure.ownerOnly":
				"Only organization owners can create new teams.",
			"teams.structure.subtitle":
				"Organize teams and keep related work grouped together.",
			"teams.structure.title": "Team hierarchy",
			"errors.validation": "Invalid input",
		},
	},
};

export function configureTranslations(config: Partial<TranslationConfig>) {
	if (config.defaultLocale) {
		translationConfig.defaultLocale = config.defaultLocale;
	}
	if (config.messages) {
		translationConfig.messages = {
			...translationConfig.messages,
			...config.messages,
		};
	}
}

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
