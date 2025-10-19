import { OAuthProvider, oAuthProviderValues } from "@/auth/tables";
import { env } from "@/data/env/server";

export const providerDisplayNames: Record<OAuthProvider, string> = {
    google: "Google",
    github: "GitHub",
    microsoft: "Microsoft",
    apple: "Apple",
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

function hasAppleConfig() {
    return Boolean(
        env.APPLE_CLIENT_ID &&
        env.APPLE_TEAM_ID &&
        env.APPLE_KEY_ID &&
        env.APPLE_PRIVATE_KEY,
    );
}

const providerConfigCheck: Record<OAuthProvider, () => boolean> = {
    google: hasGoogleConfig,
    github: hasGithubConfig,
    microsoft: hasMicrosoftConfig,
    apple: hasAppleConfig,
};

export function isOAuthProviderConfigured(provider: OAuthProvider) {
    return providerConfigCheck[provider]();
}

export function getConfiguredOAuthProviders() {
    return oAuthProviderValues.filter(isOAuthProviderConfigured);
}
