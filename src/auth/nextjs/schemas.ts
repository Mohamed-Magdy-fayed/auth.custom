import { z } from "zod";

export const signInSchema = z.object({
	email: z.email(),
	password: z.string().min(1),
	redirect: z.string().optional(),
	priceId: z.string().optional(),
});

export const signUpSchema = z.object({
	name: z.string().min(1),
	email: z.string().email(),
	password: z.string().min(8),
	inviteToken: z.string().optional(),
	redirect: z.string().optional(),
	priceId: z.string().optional(),
});
