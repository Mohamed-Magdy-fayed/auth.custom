import { z } from "zod";

export const updateProfileSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Name is required")
		.max(120, "Name is too long")
		.optional(),
});

export const createPasswordSchema = z
	.object({
		newPassword: z
			.string()
			.min(8, "New password must be at least 8 characters")
			.max(128, "New password is too long"),
		confirmPassword: z.string().min(1, "Confirm your new password"),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

export const changePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, "Enter your current password"),
		newPassword: z
			.string()
			.min(8, "New password must be at least 8 characters")
			.max(128, "New password is too long"),
		confirmPassword: z.string().min(1, "Confirm your new password"),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

export const changeEmailSchema = z
	.object({
		newEmail: z.email("Enter a valid email address"),
		confirmEmail: z.email("Enter a valid email address"),
		currentPassword: z.string().transform((value) => value.trim()),
	})
	.refine((data) => data.newEmail === data.confirmEmail, {
		message: "Emails do not match",
		path: ["confirmEmail"],
	});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreatePasswordInput = z.infer<typeof createPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;
