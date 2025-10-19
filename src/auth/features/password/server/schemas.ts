import { z } from "zod";

export const passwordResetRequestSchema = z.object({
    email: z.email(),
});

export const passwordResetSubmissionSchema = z.object({
    email: z.email(),
    otp: z
        .string()
        .trim()
        .regex(/^[0-9]{6}$/u, "Enter the 6-digit code"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});
