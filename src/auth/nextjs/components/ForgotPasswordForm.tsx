"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { requestPasswordReset } from "@/auth/features/password/server/actions";
import { passwordResetRequestSchema } from "@/auth/features/password/server/schemas";
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
import { useTranslation } from "@/lib/i18n/useTranslation";

type FormValues = z.infer<typeof passwordResetRequestSchema>;

export function ForgotPasswordForm() {
	const router = useRouter();
	const { t } = useTranslation();
	const [status, setStatus] = useState<null | {
		status: "success" | "error";
		message: string;
	}>(null);

	const form = useForm<FormValues>({
		resolver: zodResolver(passwordResetRequestSchema),
		defaultValues: { email: "" },
	});

	async function onSubmit(values: FormValues) {
		setStatus(null);
		const result = await requestPasswordReset(values);

		if (result.status === "success") {
			const params = new URLSearchParams({ email: values.email, requested: "1" });
			router.push(`/reset-password?${params.toString()}`);
			return;
		}

		setStatus(result);
	}

	return (
		<Form {...form}>
			<form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
				{status && (
					<p
						className={
							status.status === "success"
								? "text-sm text-emerald-600"
								: "text-sm text-destructive"
						}
						role={status.status === "success" ? "status" : "alert"}
						aria-live={status.status === "success" ? "polite" : "assertive"}
					>
						{status.message}
					</p>
				)}
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t("authTranslations.passwordReset.emailLabel")}</FormLabel>
							<FormControl>
								<Input type="email" autoComplete="email" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<Button
					type="submit"
					className="w-full"
					disabled={form.formState.isSubmitting}
				>
					{form.formState.isSubmitting
						? t("authTranslations.passwordReset.submitting")
						: t("authTranslations.passwordReset.submit")}
				</Button>
			</form>
		</Form>
	);
}
