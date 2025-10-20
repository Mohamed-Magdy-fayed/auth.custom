"use client";

import { useCallback, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { authMessage } from "@/auth/config";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { updateProfile } from "../profileActions";
import type { UpdateProfileInput } from "../profileSchemas";

type ProfileFormProps = {
	defaultValues: {
		displayName: string | null;
		givenName: string | null;
		familyName: string | null;
		locale: string | null;
		timezone: string | null;
	};
};

type FormValues = UpdateProfileInput & {
	name?: string;
	givenName?: string;
	familyName?: string;
	locale?: string;
	timezone?: string;
};

export function ProfileForm({ defaultValues }: ProfileFormProps) {
	const [status, setStatus] = useState<{
		type: "success" | "error";
		message: string;
	}>();
	const [isPending, startTransition] = useTransition();

	const form = useForm<FormValues>({
		defaultValues: {
			name: defaultValues.displayName ?? "",
			givenName: defaultValues.givenName ?? "",
			familyName: defaultValues.familyName ?? "",
			locale: defaultValues.locale ?? "",
			timezone: defaultValues.timezone ?? "",
		},
	});

	const onSubmit = useCallback(
		(values: FormValues) => {
			startTransition(async () => {
				form.clearErrors();
				setStatus(undefined);

				const name = values.name?.trim();
				const givenName = values.givenName?.trim() ?? "";
				const familyName = values.familyName?.trim() ?? "";
				const locale = values.locale?.trim();
				const timezone = values.timezone?.trim() ?? "";

				const result = await updateProfile({
					name: name && name.length > 0 ? name : undefined,
				});

				if (!result.success) {
					if (result.fieldErrors) {
						for (const [field, messages] of Object.entries(result.fieldErrors)) {
							const message = messages?.[0];
							if (message) {
								form.setError(field as keyof FormValues, { type: "server", message });
							}
						}
					}

					if (result.message) {
						setStatus({ type: "error", message: result.message });
					}
					return;
				}

				if (result.message) {
					setStatus({ type: "success", message: result.message });
				}
			});
		},
		[form],
	);

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				{status && (
					<p
						className={
							status.type === "success"
								? "text-sm text-emerald-600"
								: "text-sm text-destructive"
						}
					>
						{status.message}
					</p>
				)}
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								{authMessage("profile.displayName.label", "Display name")}
							</FormLabel>
							<FormControl>
								<Input
									placeholder={authMessage(
										"profile.displayName.placeholder",
										"Your name",
									)}
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="grid gap-4 md:grid-cols-2">
					<FormField
						control={form.control}
						name="givenName"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									{authMessage("profile.givenName.label", "Given name")}
								</FormLabel>
								<FormControl>
									<Input
										placeholder={authMessage(
											"profile.givenName.placeholder",
											"First name",
										)}
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="familyName"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									{authMessage("profile.familyName.label", "Family name")}
								</FormLabel>
								<FormControl>
									<Input
										placeholder={authMessage(
											"profile.familyName.placeholder",
											"Last name",
										)}
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				<div className="grid gap-4 md:grid-cols-2">
					<FormField
						control={form.control}
						name="locale"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{authMessage("profile.locale.label", "Locale")}</FormLabel>
								<FormControl>
									<Input
										placeholder={authMessage("profile.locale.placeholder", "en")}
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="timezone"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									{authMessage("profile.timezone.label", "Timezone")}
								</FormLabel>
								<FormControl>
									<Input
										placeholder={authMessage("profile.timezone.placeholder", "UTC")}
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				<div className="flex justify-end">
					<Button type="submit" disabled={isPending}>
						{isPending
							? authMessage("profile.form.saving", "Saving...")
							: authMessage("profile.form.submit", "Save changes")}
					</Button>
				</div>
			</form>
		</Form>
	);
}
