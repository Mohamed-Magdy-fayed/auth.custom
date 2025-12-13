import { z } from "zod";

import { PERMISSION_KEYS } from "../../config/permissions";

export const createOrganizationSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Organization name is required")
		.max(120, "Organization name is too long"),
	description: z.string().trim().max(240, "Description is too long").optional(),
});

export const setActiveOrganizationSchema = z.object({
	organizationId: z.uuid("Invalid organization"),
});

export const createTeamSchema = z.object({
	organizationId: z.uuid("Invalid organization"),
	name: z
		.string()
		.trim()
		.min(1, "Team name is required")
		.max(120, "Team name is too long"),
	description: z.string().trim().max(240, "Description is too long").optional(),
	parentTeamId: z.uuid().optional().or(z.literal("")),
});

export const addTeamMemberSchema = z.object({
	teamId: z.uuid("Invalid team"),
	email: z.email("Enter a valid email").trim(),
	roleId: z
		.union([z.uuid("Invalid role"), z.literal("")])
		.optional()
		.transform((value) => (value === "" ? undefined : value)),
	isNew: z.boolean().optional(),
});

export const searchTeamInviteesSchema = z.object({
	teamId: z.uuid("Invalid team"),
	query: z
		.string()
		.trim()
		.min(3, "Search requires at least 3 characters")
		.max(120, "Search term is too long"),
});

export const setTeamMemberManagerSchema = z.object({
	teamId: z.uuid("Invalid team"),
	userId: z.uuid("Invalid member"),
	isManager: z.boolean(),
});

const permissionKeyEnum = z.enum(PERMISSION_KEYS);

export const setTeamMemberRoleSchema = z.object({
	teamId: z.uuid("Invalid team"),
	userId: z.uuid("Invalid member"),
	roleId: z.union([z.uuid("Invalid role"), z.null()]).optional(),
});

export const createRoleSchema = z.object({
	organizationId: z.uuid("Invalid organization"),
	name: z.string().trim().min(2, "Role name is required").max(120),
	description: z.string().trim().max(240, "Description is too long").optional(),
	scope: z.enum(["organization", "team"] as const),
	isDefault: z.boolean().optional(),
});

export const updateRoleSchema = z.object({
	organizationId: z.uuid("Invalid organization"),
	roleId: z.uuid("Invalid role"),
	name: z.string().trim().min(2, "Role name is required").max(120),
	description: z.string().trim().max(240, "Description is too long").optional(),
});

export const deleteRoleSchema = z.object({
	organizationId: z.uuid("Invalid organization"),
	roleId: z.uuid("Invalid role"),
});

export const setRolePermissionsSchema = z.object({
	organizationId: z.uuid("Invalid organization"),
	roleId: z.uuid("Invalid role"),
	permissionKeys: z.array(permissionKeyEnum),
});

export const setRoleDefaultSchema = z.object({
	organizationId: z.uuid("Invalid organization"),
	roleId: z.uuid("Invalid role"),
	scope: z.enum(["organization", "team"] as const),
});

export const syncAuthorizationSchema = z.object({
	organizationId: z.uuid("Invalid organization"),
	applyTemplate: z.boolean().optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>;
export type SearchTeamInviteesInput = z.infer<typeof searchTeamInviteesSchema>;
export type SetTeamMemberManagerInput = z.infer<
	typeof setTeamMemberManagerSchema
>;
export type SetTeamMemberRoleInput = z.infer<typeof setTeamMemberRoleSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type DeleteRoleInput = z.infer<typeof deleteRoleSchema>;
export type SetRolePermissionsInput = z.infer<typeof setRolePermissionsSchema>;
export type SetRoleDefaultInput = z.infer<typeof setRoleDefaultSchema>;
export type SyncAuthorizationInput = z.infer<typeof syncAuthorizationSchema>;
