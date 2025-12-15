"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

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
import { LoadingSwap } from "@/components/ui/loading-swap";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { createOrganization } from "../server/actions";
import {
	type CreateOrganizationInput,
	createOrganizationSchema,
} from "../server/schemas";

type FormValues = CreateOrganizationInput & { description?: string };

export function CreateOrganizationForm() {
	const { t } = useTranslation();
	const [status, setStatus] = useState<{
		type: "success" | "error";
		message: string;
	}>();
	const [isPending, startTransition] = useTransition();

	const form = useForm<FormValues>({
		resolver: zodResolver(createOrganizationSchema),
		defaultValues: { name: "", description: "" },
	});

	const handleSubmit = (values: FormValues) => {
		startTransition(async () => {
			form.clearErrors();
			setStatus(undefined);

			const result = await createOrganization({
				name: values.name.trim(),
				description:
					values.description && values.description.trim().length > 0
						? values.description.trim()
						: undefined,
			});

			if (!result.success) {
				if ("fieldErrors" in result && result.fieldErrors) {
					for (const [field, messages] of Object.entries(result.fieldErrors)) {
						const message = (messages as string[] | undefined)?.[0];
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

			form.reset({ name: "", description: "" });

			if (result.message) {
				setStatus({ type: "success", message: result.message });
			}
		});
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
								{t("authTranslations.org.create.nameLabel")}
							</FormLabel>
							<FormControl>
								<Input
									placeholder={t("authTranslations.org.create.namePlaceholder")}
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="description"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								{t("authTranslations.org.create.descriptionLabel")}
							</FormLabel>
							<FormControl>
								<Input
									placeholder={t("authTranslations.org.create.descriptionPlaceholder")}
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="flex justify-end">
					<Button type="submit" disabled={isPending}>
						<LoadingSwap
							isLoading={isPending}
							text={t("authTranslations.org.create.submitting")}
						>
							{t("authTranslations.org.create.submit")}
						</LoadingSwap>
					</Button>
				</div>
			</form>
		</Form>
	);
}
