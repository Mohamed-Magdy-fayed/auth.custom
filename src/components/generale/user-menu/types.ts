import type { PasskeyListItem } from "@/auth/features/passkeys/server/actions";
import type {
	AuthorizationRoleSummary,
	PermissionCatalogGroup,
} from "@/auth/nextjs/org/types";

export type OrganizationSummary = {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	status: string;
	isDefault: boolean;
};

export type TeamSummary = {
	id: string;
	name: string;
	description: string | null;
	memberCount: number;
	isManager: boolean;
	canManageMembers: boolean;
};

export type AuthorizationSummary = {
	canEdit: boolean;
	isOwner: boolean;
	roles: AuthorizationRoleSummary[];
	permissionCatalog: PermissionCatalogGroup[];
};

export type TeamDialogData = {
	activeOrganization: OrganizationSummary | null;
	teams: TeamSummary[];
	canManageAny: boolean;
	authorization: AuthorizationSummary;
};

export type UserMenuProps = {
	name: string;
	profileName: string;
	email: string;
	avatarUrl?: string | null;
	initials: string;
	emailVerified: boolean;
	hasPassword: boolean;
	passkeys: PasskeyListItem[];
	organizations: OrganizationSummary[];
	teamData: TeamDialogData;
};
