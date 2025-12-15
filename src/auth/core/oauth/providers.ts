import { OAuthProvider, oAuthProviderValues } from "@/auth/tables/user-oauth-accounts-table";
import { env } from "@/data/env/server";

export const providerDisplayNames: Record<OAuthProvider, string> = {
	google: "Google",
	github: "GitHub",
	microsoft: "Microsoft",
};

function hasGoogleConfig() {
	return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

function hasGithubConfig() {
	return Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
}

function hasMicrosoftConfig() {
	return Boolean(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET);
}

const providerConfigCheck: Record<OAuthProvider, () => boolean> = {
	google: hasGoogleConfig,
	github: hasGithubConfig,
	microsoft: hasMicrosoftConfig,
};

export function isOAuthProviderConfigured(provider: OAuthProvider) {
	return providerConfigCheck[provider]();
}

export function getConfiguredOAuthProviders() {
	return oAuthProviderValues.filter(isOAuthProviderConfigured);
}
