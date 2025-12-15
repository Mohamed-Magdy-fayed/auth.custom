import { redirect } from "next/navigation";
import { z } from "zod";
import {
	getAuthenticatedUser,
	getOrganizationForUser,
} from "@/saas/db/queries";

export type ActionState = {
	error?: string;
	success?: string;
	[key: string]: unknown;
};

type ValidatedActionFunction<S extends z.ZodTypeAny, T> = (
	data: z.infer<S>,
	formData: FormData,
) => Promise<T>;

export function validatedAction<S extends z.ZodTypeAny, T>(
	schema: S,
	action: ValidatedActionFunction<S, T>,
) {
	return async (_prevState: ActionState, formData: FormData) => {
		const result = schema.safeParse(Object.fromEntries(formData));
		if (!result.success) {
			return { error: result.error.issues[0]?.message ?? "Invalid input" };
		}

		return action(result.data, formData);
	};
}

type ValidatedActionWithUserFunction<S extends z.ZodTypeAny, T> = (
	data: z.infer<S>,
	formData: FormData,
	user: Awaited<ReturnType<typeof getAuthenticatedUser>>,
) => Promise<T>;

export function validatedActionWithUser<S extends z.ZodTypeAny, T>(
	schema: S,
	action: ValidatedActionWithUserFunction<S, T>,
) {
	return async (_prevState: ActionState, formData: FormData) => {
		const user = await getAuthenticatedUser();
		if (!user) {
			redirect("/sign-in");
		}

		const result = schema.safeParse(Object.fromEntries(formData));
		if (!result.success) {
			return { error: result.error.issues[0]?.message ?? "Invalid input" };
		}

		return action(result.data, formData, user);
	};
}

type ActionWithOrganizationFunction<T> = (
	formData: FormData,
	organization: NonNullable<Awaited<ReturnType<typeof getOrganizationForUser>>>,
) => Promise<T>;

export function withOrganization<T>(action: ActionWithOrganizationFunction<T>) {
	return async (formData: FormData): Promise<T> => {
		const organization = await getOrganizationForUser();
		if (!organization) {
			redirect("/sign-in");
		}

		return action(formData, organization);
	};
}
