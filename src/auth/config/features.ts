export type AuthFeature =
    | "password"
    | "passkeys"
    | "oauth"
    | "sessions"
    | "organizations"
    | "teams"
    | "magicLinks";

export type FeatureConfig = Record<AuthFeature, boolean>;

const defaultFeatureConfig: FeatureConfig = {
    password: true,
    passkeys: true,
    oauth: true,
    sessions: true,
    organizations: true,
    teams: true,
    magicLinks: false,
};

let activeFeatureConfig: FeatureConfig = { ...defaultFeatureConfig };

export function configureAuthFeatures(overrides: Partial<FeatureConfig>) {
    activeFeatureConfig = { ...defaultFeatureConfig, ...overrides };
}

export function getFeatureConfig(): FeatureConfig {
    return activeFeatureConfig;
}

export function isFeatureEnabled(feature: AuthFeature): boolean {
    return activeFeatureConfig[feature];
}

export function assertFeatureEnabled(feature: AuthFeature, message?: string) {
    if (!isFeatureEnabled(feature)) {
        const defaultMessage = `The ${feature} authentication feature is disabled.`;
        throw new Error(message ?? defaultMessage);
    }
}
