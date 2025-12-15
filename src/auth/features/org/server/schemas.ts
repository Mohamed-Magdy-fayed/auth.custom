import { z } from "zod";

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

export const upsertUserOrganizationsSchema = z.object({
	userId: z.uuid("Invalid user"),
	organizationIds: z.array(z.uuid("Invalid organization")),
});

export const inviteMemberSchema = z.object({
	email: z
		.string()
		.trim()
		.email("Valid email is required")
		.max(320, "Email is too long"),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpsertUserOrganizationsInput = z.infer<
	typeof upsertUserOrganizationsSchema
>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
