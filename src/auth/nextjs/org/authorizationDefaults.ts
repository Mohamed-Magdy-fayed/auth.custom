import {
	OWNER_ROLE_KEY,
	type PermissionKey,
	permissionDefinitions,
} from "./permissions";

export type RoleTemplate = {
	key: string;
	name: string;
	description?: string;
	scope: "organization" | "team";
	permissions: PermissionKey[];
	isDefault?: boolean;
};

const allPermissionKeys = permissionDefinitions.map(
	(definition) => definition.key,
);

/**
 * Default role templates used when a new organization is provisioned.
 * Adjust this list to match your product's multi-tenant model.
 */
export const defaultRoleTemplates: RoleTemplate[] = [
	{
		key: OWNER_ROLE_KEY,
		name: "Owner",
		description: "Full control over the organization",
		scope: "organization",
		permissions: allPermissionKeys,
	},
	{
		key: "org-admin",
		name: "Administrator",
		description: "Manage workspace settings, teams, and members",
		scope: "organization",
		permissions: [
			"org:update",
			"org:invite",
			"org:teams",
			"org:roles",
			"team:create",
			"team:update",
			"team:delete",
			"team:members",
			"member:assign-role",
			"member:remove",
			"member:update",
			"session:revoke",
		],
	},
	{
		key: "org-member",
		name: "Member",
		description: "Baseline access for most workspace collaborators",
		scope: "organization",
		permissions: [],
		isDefault: true,
	},
	{
		key: "team-lead",
		name: "Team lead",
		description: "Manage membership and settings for their team",
		scope: "team",
		permissions: [
			"team:update",
			"team:members",
			"member:assign-role",
			"member:remove",
			"member:update",
		],
	},
	{
		key: "team-collaborator",
		name: "Team collaborator",
		description: "Participate in team work without management permissions",
		scope: "team",
		permissions: [],
		isDefault: true,
	},
];
