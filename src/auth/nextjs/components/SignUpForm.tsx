"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { OAuthProvider } from "@/auth/tables/user-oauth-accounts-table";
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
import { oAuthSignIn, signUp } from "../actions";
import { signUpSchema } from "../schemas";

type OAuthOption = { provider: OAuthProvider; label: string };

type SignUpFormProps = {
	providers: OAuthOption[];
	redirect?: string;
	priceId?: string;
	inviteToken?: string;
};

export function SignUpForm({
	providers,
	redirect,
	priceId,
	inviteToken,
}: SignUpFormProps) {
	const { t } = useTranslation();
	const [error, setError] = useState<string>();
	const [oauthError, setOauthError] = useState<string>();
	const form = useForm<z.infer<typeof signUpSchema>>({
		resolver: zodResolver(signUpSchema),
		defaultValues: {
			name: "",
			email: "",
			password: "",
			redirect: redirect ?? "",
			priceId: priceId ?? "",
			inviteToken: inviteToken ?? "",
		},
	});

	const { isSubmitting } = form.formState;

	async function onSubmit(data: z.infer<typeof signUpSchema>) {
		const error = await signUp(data);
		setError(error);
	}

	async function handleOAuthClick(provider: OAuthProvider) {
		setOauthError(undefined);
		const result = await oAuthSignIn(provider);
		if (result && "error" in result && result.error) {
			setOauthError(result.error);
		}
	}

	const signInParams = new URLSearchParams();
	if (redirect) signInParams.set("redirect", redirect);
	if (priceId) signInParams.set("priceId", priceId);
	const signInHref =
		signInParams.size > 0 ? `/sign-in?${signInParams.toString()}` : "/sign-in";

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
				<input
					type="hidden"
					{...form.register("redirect")}
					defaultValue={redirect ?? ""}
				/>
				<input
					type="hidden"
					{...form.register("priceId")}
					defaultValue={priceId ?? ""}
				/>
				<input
					type="hidden"
					{...form.register("inviteToken")}
					defaultValue={inviteToken ?? ""}
				/>
				{error && (
					<p className="text-destructive" role="alert" aria-live="assertive">
						{error}
					</p>
				)}
				{oauthError && (
					<p className="text-destructive" role="alert" aria-live="assertive">
						{oauthError}
					</p>
				)}
				{providers.length > 0 && (
					<div className="flex flex-wrap gap-3">
						{providers.map((option) => (
							<Button
								key={option.provider}
								type="button"
								onClick={async () => await handleOAuthClick(option.provider)}
							>
								{t("authTranslations.oauth.providerButton", { provider: option.label })}
							</Button>
						))}
					</div>
				)}
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t("authTranslations.signUp.nameLabel")}</FormLabel>
							<FormControl>
								<Input type="text" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t("authTranslations.signUp.emailLabel")}</FormLabel>
							<FormControl>
								<Input type="email" {...field} />
							</FormControl>
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
								{t("authTranslations.signUp.passwordLabel")}
							</FormLabel>
							<FormControl>
								<Input type="password" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="flex gap-4 justify-end">
					<Button asChild variant="link">
						<Link href={signInHref}>
							{t("authTranslations.signUp.toSignIn")}
						</Link>
					</Button>
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting
							? t("authTranslations.signUp.submitting")
							: t("authTranslations.signUp.submit")}
					</Button>
				</div>
			</form>
		</Form>
	);
}
