"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { authMessage } from "@/auth/config";
import { resetPassword } from "@/auth/features/password/server/actions";
import { passwordResetSubmissionSchema } from "@/auth/features/password/server/schemas";
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
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from "@/components/ui/input-otp";

type FormValues = z.infer<typeof passwordResetSubmissionSchema>;

export function ResetPasswordForm({
	initialEmail = "",
}: {
	initialEmail?: string;
}) {
	const [status, setStatus] = useState<null | {
		status: "success" | "error";
		message: string;
	}>(null);

	const form = useForm<FormValues>({
		resolver: zodResolver(passwordResetSubmissionSchema),
		defaultValues: { email: initialEmail, otp: "", password: "" },
	});

	async function onSubmit(values: FormValues) {
		setStatus(null);
		const result = await resetPassword(values);
		setStatus(result);

		if (result.status === "success") {
			form.reset({ email: values.email, otp: "", password: "" });
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
				<FormField
					control={form.control}
					name="otp"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								{authMessage("passwordReset.otpLabel", "Verification code")}
							</FormLabel>
							<FormControl>
								<InputOTP
									maxLength={6}
									value={field.value}
									onChange={(value) => field.onChange(value.replace(/\D/g, ""))}
									inputMode="numeric"
								>
									<InputOTPGroup>
										{[0, 1, 2, 3, 4, 5].map((slot) => (
											<InputOTPSlot key={slot} index={slot} />
										))}
									</InputOTPGroup>
								</InputOTP>
							</FormControl>
							<p className="text-xs text-muted-foreground">
								{authMessage(
									"passwordReset.otpHelp",
									"Enter the 6-digit code sent to your email.",
								)}
							</p>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="password"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								{authMessage("passwordReset.newPasswordLabel", "New password")}
							</FormLabel>
							<FormControl>
								<Input type="password" autoComplete="new-password" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="flex justify-between">
					<Button asChild variant="link">
						<Link href="/sign-in">
							{authMessage("passwordReset.backToSignIn", "Back to sign in")}
						</Link>
					</Button>
					<Button type="submit" disabled={form.formState.isSubmitting}>
						{form.formState.isSubmitting
							? authMessage("passwordReset.reset.submitting", "Updating...")
							: authMessage("passwordReset.reset.submit", "Update password")}
					</Button>
				</div>
			</form>
		</Form>
	);
}
