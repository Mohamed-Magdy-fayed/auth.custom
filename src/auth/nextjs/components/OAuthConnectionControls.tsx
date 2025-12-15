"use client";

import { useTransition } from "react";

import type { OAuthProvider } from "@/auth/tables/user-oauth-accounts-table";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { oAuthSignIn } from "../actions";
import { disconnectOAuthAccount } from "../oauthActions";

type OAuthConnectionControlsProps = {
	provider: OAuthProvider;
	connected: boolean;
	onDisconnected?: (provider: OAuthProvider, message?: string) => void;
	onError?: (message: string) => void;
};

export function OAuthConnectionControls({
	provider,
	connected,
	onDisconnected,
	onError,
}: OAuthConnectionControlsProps) {
	const { t } = useTranslation();
	const [isPending, startTransition] = useTransition();

	if (connected) {
		return (
			<Button
				variant="destructive"
				size="sm"
				disabled={isPending}
				onClick={() => {
					startTransition(async () => {
						const result = await disconnectOAuthAccount(provider);
						if (!result.success) {
							const message = result.message ?? t("authTranslations.oauth.connections.disconnectFailed");
							if (onError) {
								onError(message);
								return;
							}
							window.alert(message);
							return;
						}
						onDisconnected?.(provider, result.message);
					});
				}}
			>
				{isPending
					? t("authTranslations.oauth.connections.disconnecting")
					: t("authTranslations.oauth.connections.disconnect")}
			</Button>
		);
	}

	return (
		<Button
			variant="outline"
			size="sm"
			disabled={isPending}
			onClick={() => {
				startTransition(async () => {
					const result = await oAuthSignIn(provider);
					if (result && "error" in result && result.error) {
						if (onError) {
							onError(result.error);
							return;
						}
						window.alert(result.error);
					}
				});
			}}
		>
			{isPending ? t("authTranslations.oauth.connections.connecting") : t("authTranslations.oauth.connections.connect")}
		</Button>
	);
}
