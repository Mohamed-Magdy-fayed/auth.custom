"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { startAuthentication } from "@simplewebauthn/browser";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { authMessage } from "@/auth/config";
import type { OAuthProvider } from "@/auth/tables";
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
import { oAuthSignIn, signIn } from "../actions";
import {
	beginPasskeyAuthentication,
	completePasskeyAuthentication,
} from "../passkeyActions";
import { signInSchema } from "../schemas";

type OAuthOption = { provider: OAuthProvider; label: string };

type SignInFormProps = {
	providers: OAuthOption[];
	redirect?: string;
	priceId?: string;
};

export function SignInForm({ providers, redirect, priceId }: SignInFormProps) {
	const [error, setError] = useState<string>();
	const [oauthError, setOauthError] = useState<string>();
	const [isPasskeyPending, setIsPasskeyPending] = useState(false);
	const router = useRouter();
	const form = useForm<z.infer<typeof signInSchema>>({
		resolver: zodResolver(signInSchema),
		defaultValues: {
			email: "",
			password: "",
			redirect: redirect ?? "",
			priceId: priceId ?? "",
		},
	});
	const { isSubmitting } = form.formState;

	const signUpParams = new URLSearchParams();
	if (redirect) signUpParams.set("redirect", redirect);
	if (priceId) signUpParams.set("priceId", priceId);
	const signUpHref =
		signUpParams.size > 0 ? `/sign-up?${signUpParams.toString()}` : "/sign-up";

	async function onSubmit(data: z.infer<typeof signInSchema>) {
		setError(undefined);
		const error = await signIn(data);
		setError(error);
	}

	async function handleOAuthClick(provider: OAuthProvider) {
		setError(undefined);
		setOauthError(undefined);
		const result = await oAuthSignIn(provider);
		if (result && "error" in result && result.error) {
			setOauthError(result.error);
		}
	}

	async function handlePasskeySignIn() {
		setError(undefined);
		setOauthError(undefined);

		const emailValid = await form.trigger("email");
		if (!emailValid) {
			return;
		}

		const email = form.getValues("email");
		if (!email) {
			setError(
				authMessage(
					"passkeys.auth.error.emailRequired",
					"Enter your email to sign in with a passkey.",
				),
			);
			return;
		}

		if (typeof window === "undefined" || !window.PublicKeyCredential) {
			setError(
				authMessage(
					"passkeys.auth.error.unsupported",
					"Passkeys aren't supported in this browser yet.",
				),
			);
			return;
		}

		try {
			setIsPasskeyPending(true);

			const beginResult = await beginPasskeyAuthentication(email);
			if (!beginResult.success) {
				setError(beginResult.message);
				return;
			}

			const assertion = await startAuthentication({
				optionsJSON: beginResult.options,
			});
			const completeResult = await completePasskeyAuthentication(
				beginResult.email,
				assertion,
			);

			if (!completeResult.success) {
				setError(completeResult.message);
				return;
			}

			router.replace("/");
			router.refresh();
		} catch (caught) {
			if (
				caught instanceof DOMException &&
				(caught.name === "NotAllowedError" || caught.name === "AbortError")
			) {
				setError(
					authMessage(
						"passkeys.auth.error.cancelled",
						"Passkey sign-in was cancelled.",
					),
				);
				return;
			}

			console.error("Passkey sign-in failed", caught);
			setError(
				authMessage(
					"passkeys.auth.error.generic",
					"Unable to sign in with passkey.",
				),
			);
		} finally {
			setIsPasskeyPending(false);
		}
	}

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
				{error && <p className="text-destructive">{error}</p>}
				{oauthError && <p className="text-destructive">{oauthError}</p>}
				{providers.length > 0 && (
					<div className="flex flex-wrap gap-3">
						{providers.map((option) => (
							<Button
								key={option.provider}
								type="button"
								onClick={async () => await handleOAuthClick(option.provider)}
							>
								{authMessage("auth.oauth.providerButton", option.label, {
									provider: option.label,
									providerKey: option.provider,
								})}
							</Button>
						))}
					</div>
				)}
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{authMessage("auth.signIn.emailLabel", "Email")}</FormLabel>
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
								{authMessage("auth.signIn.passwordLabel", "Password")}
							</FormLabel>
							<FormControl>
								<Input type="password" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="flex flex-wrap items-center justify-between gap-4">
					<Button
						type="button"
						variant="outline"
						disabled={isPasskeyPending || isSubmitting}
						onClick={handlePasskeySignIn}
					>
						{isPasskeyPending
							? authMessage("passkeys.auth.pending", "Waiting for passkey...")
							: authMessage("passkeys.auth.button", "Sign in with passkey")}
					</Button>
					<div className="flex gap-4">
						<Button asChild variant="link">
							<Link href="/forgot-password">
								{authMessage("auth.signIn.forgotPassword", "Forgot password?")}
							</Link>
						</Button>
						<Button asChild variant="link">
							<Link href={signUpHref}>
								{authMessage("auth.signIn.toSignUp", "Sign Up")}
							</Link>
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{authMessage("auth.signIn.submit", "Sign In")}
						</Button>
					</div>
				</div>
			</form>
		</Form>
	);
}
