export {
	type AuthFeature,
	assertFeatureEnabled,
	configureAuthFeatures,
	type FeatureConfig,
	getFeatureConfig,
	isFeatureEnabled,
} from "./config/features";

export {
	configurePermissions,
	getAvailablePermissions,
} from "./config/permissions";

export {
	authMessage,
	configureTranslations,
} from "./config/translations";
