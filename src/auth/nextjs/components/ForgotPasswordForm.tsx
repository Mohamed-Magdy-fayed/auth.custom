"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { authMessage } from "@/auth/config";
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

type FormValues = z.infer<typeof passwordResetRequestSchema>;

export function ForgotPasswordForm() {
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
		setStatus(result);

		if (result.status === "success") {
			form.reset();
		}
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
					>
						{status.message}
					</p>
				)}
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{authMessage("passwordReset.emailLabel", "Email")}</FormLabel>
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
						? authMessage("passwordReset.submitting", "Sending...")
						: authMessage("passwordReset.submit", "Send reset code")}
				</Button>
			</form>
		</Form>
	);
}
