const ROLE_KEYS = [
	"super_admin",
	"admin",
	"ops_lead",
	"auditor",
	"dispatcher",
	"driver",
	"rider",
	"sales",
	"customer",
] as const;

export type UserRole = (typeof ROLE_KEYS)[number];

export type DefaultAction = "view" | "update" | "create" | "delete";

const RESOURCE_KEYS = [
	"users",
	"branches",
	"screens",
	"fleet",
	"pricing",
	"orders",
	"notifications",
	"analytics",
] as const;

const ACTIONS: DefaultAction[] = ["view", "create", "update", "delete"];

export type PermissionResource = (typeof RESOURCE_KEYS)[number];

export const PERMISSION_KEYS = RESOURCE_KEYS.flatMap((resource) =>
	ACTIONS.map((action) => `${resource}:${action}` as const),
) as readonly `${PermissionResource}:${DefaultAction}`[];

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type PermissionCategory =
	| "Users"
	| "Branches"
	| "Screens"
	| "Fleet"
	| "Pricing"
	| "Orders"
	| "Notifications"
	| "Analytics";

export type PermissionDefinition = {
	key: PermissionKey;
	label: string;
	description: string;
	category: PermissionCategory;
};

const capitalize = (value: string) =>
	value.charAt(0).toUpperCase() + value.slice(1);

export const permissionDefinitions: PermissionDefinition[] =
	PERMISSION_KEYS.map((key) => {
		const [resource, action] = key.split(":") as [
			PermissionResource,
			DefaultAction,
		];
		return {
			key,
			label: `${capitalize(action)} ${capitalize(resource)}`,
			description: `Allows ${action} access to ${resource}`,
			category: capitalize(resource) as PermissionCategory,
		};
	});

export const permissionDescriptions: Record<PermissionKey, string> =
	Object.fromEntries(
		permissionDefinitions.map((definition) => [
			definition.key,
			definition.description,
		]),
	) as Record<PermissionKey, string>;

export const OWNER_ROLE_KEY = "owner";

export type OrgMembershipLike = {
	status?: string | null;
	role?: { key?: string | null } | null;
	roleKey?: string | null;
};

export type TeamMembershipLike = {
	status?: string | null;
	isManager?: boolean | null;
};

export type PermissionContext = {
	branchId?: string;
	defaultBranchId?: string;
	screenKey?: string;
	id?: string;
};

export type PartialUser = {
	id: string;
	role: UserRole;
	defaultBranchId?: string | null;
};

type PermissionCheck =
	| boolean
	| ((user: PartialUser, data?: PermissionContext) => boolean);
type PermissionMap = Partial<Record<DefaultAction, PermissionCheck>>;
type RolePermissions = Partial<Record<PermissionResource, PermissionMap>>;
type RolesWithPermissions = Record<UserRole, RolePermissions>;

const unrestricted: PermissionMap = {
	create: true,
	view: true,
	update: true,
	delete: true,
};

const isSameUser: PermissionCheck = (user, data) =>
	Boolean(data?.id && data.id === user.id);

const matchesUserBranch: PermissionCheck = (user, data) =>
	Boolean(
		user.defaultBranchId &&
			data?.defaultBranchId &&
			data.defaultBranchId === user.defaultBranchId,
	);

const matchesBranch: PermissionCheck = (user, data) =>
	Boolean(user.defaultBranchId && data?.branchId === user.defaultBranchId);

const matchesScreenBranch: PermissionCheck = (user, data) =>
	data?.branchId == null
		? true
		: Boolean(user.defaultBranchId && data.branchId === user.defaultBranchId);

const matchesFleetBranch: PermissionCheck = (user, data) =>
	data?.branchId == null
		? Boolean(user.role)
		: Boolean(user.defaultBranchId && data.branchId === user.defaultBranchId);

const matchesPricingBranch: PermissionCheck = (user, data) =>
	data?.branchId == null
		? Boolean(user.role)
		: Boolean(user.defaultBranchId && data.branchId === user.defaultBranchId);

const matchesOrdersBranch: PermissionCheck = (user, data) =>
	data?.branchId == null
		? Boolean(user.role)
		: Boolean(user.defaultBranchId && data.branchId === user.defaultBranchId);

const matchesNotificationsBranch: PermissionCheck = (user, data) =>
	data?.branchId == null
		? Boolean(user.role)
		: Boolean(user.defaultBranchId && data.branchId === user.defaultBranchId);

const matchesAnalyticsBranch: PermissionCheck = (user, data) =>
	data?.branchId == null
		? Boolean(user.role)
		: Boolean(user.defaultBranchId && data.branchId === user.defaultBranchId);

export const ROLES: RolesWithPermissions = {
	super_admin: {
		users: unrestricted,
		branches: unrestricted,
		screens: unrestricted,
		fleet: unrestricted,
		pricing: unrestricted,
		orders: unrestricted,
		notifications: unrestricted,
		analytics: unrestricted,
	},
	admin: {
		users: unrestricted,
		branches: unrestricted,
		screens: unrestricted,
		fleet: unrestricted,
		pricing: unrestricted,
		orders: unrestricted,
		notifications: unrestricted,
		analytics: unrestricted,
	},
	ops_lead: {
		users: {
			create: matchesUserBranch,
			view: matchesUserBranch,
			update: matchesUserBranch,
			delete: matchesUserBranch,
		},
		branches: { view: matchesBranch, update: matchesBranch },
		screens: { view: matchesScreenBranch, update: matchesScreenBranch },
		fleet: {
			view: matchesFleetBranch,
			create: matchesFleetBranch,
			update: matchesFleetBranch,
			delete: matchesFleetBranch,
		},
		pricing: {
			view: matchesPricingBranch,
			create: matchesPricingBranch,
			update: matchesPricingBranch,
			delete: matchesPricingBranch,
		},
		orders: {
			view: matchesOrdersBranch,
			create: matchesOrdersBranch,
			update: matchesOrdersBranch,
			delete: matchesOrdersBranch,
		},
		notifications: {
			view: matchesNotificationsBranch,
			create: matchesNotificationsBranch,
			update: matchesNotificationsBranch,
			delete: matchesNotificationsBranch,
		},
		analytics: {
			view: matchesAnalyticsBranch,
			create: matchesAnalyticsBranch,
			update: matchesAnalyticsBranch,
			delete: matchesAnalyticsBranch,
		},
	},
	auditor: {
		users: { view: true },
		branches: { view: true },
		screens: { view: true },
		fleet: { view: true },
		pricing: { view: true },
		orders: { view: true },
		notifications: { view: true },
		analytics: { view: true },
	},
	dispatcher: {
		users: {
			create: matchesUserBranch,
			view: matchesUserBranch,
			update: matchesUserBranch,
			delete: matchesUserBranch,
		},
		branches: { view: matchesBranch, update: matchesBranch },
		screens: { view: matchesScreenBranch },
		fleet: {
			view: matchesFleetBranch,
			create: matchesFleetBranch,
			update: matchesFleetBranch,
		},
		pricing: {
			view: matchesPricingBranch,
			create: matchesPricingBranch,
			update: matchesPricingBranch,
		},
		orders: {
			view: matchesOrdersBranch,
			create: matchesOrdersBranch,
			update: matchesOrdersBranch,
		},
		notifications: {
			view: matchesNotificationsBranch,
			create: matchesNotificationsBranch,
			update: matchesNotificationsBranch,
		},
		analytics: {
			view: matchesAnalyticsBranch,
			create: matchesAnalyticsBranch,
			update: matchesAnalyticsBranch,
		},
	},
	driver: {
		users: { view: isSameUser, update: isSameUser },
		screens: { view: matchesScreenBranch },
		orders: { view: matchesOrdersBranch },
		notifications: { view: matchesNotificationsBranch },
	},
	rider: {
		users: { view: isSameUser, update: isSameUser },
		screens: { view: matchesScreenBranch },
		orders: { view: matchesOrdersBranch },
		notifications: { view: matchesNotificationsBranch },
	},
	sales: {
		users: { view: isSameUser, update: isSameUser },
		screens: { view: matchesScreenBranch },
		orders: { view: matchesOrdersBranch },
		notifications: { view: matchesNotificationsBranch },
	},
	customer: {
		users: { view: isSameUser, update: isSameUser },
		screens: { view: true },
		notifications: { view: true },
	},
};

export function hasPermission(
	user: PartialUser,
	resource: PermissionResource,
	action: DefaultAction,
	data?: PermissionContext,
) {
	const rolePermissions = ROLES[user.role];
	const permission = rolePermissions?.[resource]?.[action];
	if (permission == null) return false;

	if (typeof permission === "boolean") return permission;
	return permission(user, data);
}

export function isActiveOrgMembership(
	membership: OrgMembershipLike | null | undefined,
) {
	return membership?.status === "active";
}

export function isOwnerMembership(
	membership: OrgMembershipLike | null | undefined,
) {
	if (!isActiveOrgMembership(membership)) {
		return false;
	}

	const roleKey = membership?.role?.key ?? membership?.roleKey ?? null;
	return roleKey === OWNER_ROLE_KEY;
}

export function isActiveTeamManager(
	membership: TeamMembershipLike | null | undefined,
) {
	return membership?.status === "active" && membership?.isManager === true;
}

export function canCreateTeamFromMembership(
	membership: OrgMembershipLike | null | undefined,
) {
	return isOwnerMembership(membership);
}

export function canManageTeamMembersFromMemberships(params: {
	organizationMembership: OrgMembershipLike | null | undefined;
	teamMembership: TeamMembershipLike | null | undefined;
}) {
	return (
		isOwnerMembership(params.organizationMembership) ||
		isActiveTeamManager(params.teamMembership)
	);
}

export function getAvailablePermissions(): PermissionDefinition[] {
	return permissionDefinitions;
}
