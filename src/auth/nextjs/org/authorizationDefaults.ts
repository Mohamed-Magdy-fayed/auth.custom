import type { DefaultAction } from "../../config/permissions";
import {
	OWNER_ROLE_KEY,
	PERMISSION_KEYS,
	type PermissionKey,
	type PermissionResource,
	permissionDefinitions,
} from "../../config/permissions";

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

const grant = (
	resource: PermissionResource,
	actions: DefaultAction[],
): PermissionKey[] =>
	actions.map((action) => `${resource}:${action}` as PermissionKey);

const orgAdminPermissions: PermissionKey[] = [...PERMISSION_KEYS];
const orgMemberPermissions: PermissionKey[] = [
	...grant("screens", ["view"]),
	...grant("orders", ["view"]),
	...grant("notifications", ["view"]),
	...grant("analytics", ["view"]),
];

const teamLeadPermissions: PermissionKey[] = [
	...grant("screens", ["view", "update"]),
	...grant("orders", ["view", "update"]),
	...grant("notifications", ["view", "update"]),
	...grant("analytics", ["view"]),
];

const teamCollaboratorPermissions: PermissionKey[] = [
	...grant("screens", ["view"]),
	...grant("orders", ["view"]),
	...grant("notifications", ["view"]),
];

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
		permissions: orgAdminPermissions,
	},
	{
		key: "org-member",
		name: "Member",
		description: "Baseline access for most workspace collaborators",
		scope: "organization",
		permissions: orgMemberPermissions,
		isDefault: true,
	},
	{
		key: "team-lead",
		name: "Team lead",
		description: "Manage membership and settings for their team",
		scope: "team",
		permissions: teamLeadPermissions,
	},
	{
		key: "team-collaborator",
		name: "Team collaborator",
		description: "Participate in team work without management permissions",
		scope: "team",
		permissions: teamCollaboratorPermissions,
		isDefault: true,
	},
];
