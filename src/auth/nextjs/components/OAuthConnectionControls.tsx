"use client";

import { useTransition } from "react";

import { authMessage } from "@/auth/config";
import type { OAuthProvider } from "@/auth/tables";
import { Button } from "@/components/ui/button";
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
							const message =
								result.message ??
								authMessage(
									"oauth.connections.disconnectFailed",
									"Unable to remove connection.",
								);
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
					? authMessage("oauth.connections.disconnecting", "Disconnecting...")
					: authMessage("oauth.connections.disconnect", "Disconnect")}
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
			{isPending
				? authMessage("oauth.connections.connecting", "Connecting...")
				: authMessage("oauth.connections.connect", "Connect")}
		</Button>
	);
}
