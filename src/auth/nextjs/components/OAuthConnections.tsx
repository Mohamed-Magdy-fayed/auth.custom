import { getT } from "@/lib/i18n/actions";
import { listOAuthConnections } from "../oauthActions";
import { OAuthConnectionControls } from "./OAuthConnectionControls";

function formatDate(value: Date | null) {
	if (!value) return null;
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(value);
}

export async function OAuthConnections() {
	const { t } = await getT();
	const connections = await listOAuthConnections();

	if (connections.length === 0) {
		return (
			<p className="text-sm text-muted-foreground">
				{t("authTranslations.oauth.connections.empty")}
			</p>
		);
	}

	return (
		<div className="space-y-3">
			{connections.map((connection) => {
				const connectedAt = formatDate(connection.connectedAt);
				const statusCopy = connection.connected
					? connectedAt
						? t("authTranslations.oauth.connections.connectedAt", { date: connectedAt })
						: t("authTranslations.oauth.connections.connected")
					: t("authTranslations.oauth.connections.notConnected");

				return (
					<div
						key={connection.provider}
						className="flex items-center justify-between rounded-md border border-muted-foreground/20 p-3"
					>
						<div>
							<p className="font-medium">{connection.displayName}</p>
							<p className="text-sm text-muted-foreground">{statusCopy}</p>
						</div>
						<OAuthConnectionControls
							provider={connection.provider}
							connected={connection.connected}
						/>
					</div>
				);
			})}
		</div>
	);
}
