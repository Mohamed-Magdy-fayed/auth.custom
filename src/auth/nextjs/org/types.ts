import type { PermissionKey } from "../../config/permissions";

export type AuthorizationRoleSummary = {
	id: string;
	key: string;
	name: string;
	description: string | null;
	scope: "organization" | "team";
	isDefault: boolean;
	permissions: PermissionKey[];
	assignmentCount: number;
	locked: boolean;
};

export type PermissionCatalogGroup = {
	category: string;
	items: Array<{ key: PermissionKey; label: string; description: string }>;
};

export type AuthorizationSummary = {
	canEdit: boolean;
	isOwner: boolean;
	roles: AuthorizationRoleSummary[];
	permissionCatalog: PermissionCatalogGroup[];
};
