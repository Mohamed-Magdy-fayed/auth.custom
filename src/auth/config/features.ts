// Centralized feature toggles so teams can flip auth capabilities in one place before copying this folder.
export type AuthFeature =
	| "password"
	| "passkeys"
	| "oauth"
	| "sessions"
	| "organizations"
	| "teams"
	| "magicLinks";

export type FeatureConfig = Partial<Record<AuthFeature, boolean>>;

export const FEATURE_DEFAULTS: FeatureConfig = {
	password: true,
	passkeys: true,
	oauth: true,
	sessions: false,
	organizations: false,
	teams: false,
	magicLinks: false,
};

let activeFeatureConfig: FeatureConfig = { ...FEATURE_DEFAULTS };

export function configureAuthFeatures(overrides: FeatureConfig = {}) {
	activeFeatureConfig = { ...FEATURE_DEFAULTS, ...overrides };
}

export function getFeatureConfig(): FeatureConfig {
	return activeFeatureConfig;
}

export function isFeatureEnabled(feature: AuthFeature): boolean {
	return activeFeatureConfig[feature] ?? false;
}

export function assertFeatureEnabled(feature: AuthFeature, message?: string) {
	if (!isFeatureEnabled(feature)) {
		const defaultMessage = `The ${feature} authentication feature is disabled.`;
		throw new Error(message ?? defaultMessage);
	}
}
