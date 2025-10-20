import type { PermissionDefinition } from "../nextjs/org/permissions";
import { permissionDefinitions } from "../nextjs/org/permissions";
import { type AuthFeature, isFeatureEnabled } from "./features";

type PermissionConfig = {
	omitWhenFeatureDisabled?: Record<string, Array<string>>;
};

const permissionConfig: PermissionConfig = {
	omitWhenFeatureDisabled: {
		oauth: ["auth:provider:link", "auth:provider:unlink"],
		password: ["session:revoke"],
	},
};

export function configurePermissions(config: Partial<PermissionConfig>) {
	Object.assign(permissionConfig, config);
}

export function getAvailablePermissions(): PermissionDefinition[] {
	const { omitWhenFeatureDisabled } = permissionConfig;

	const disabledKeys = new Set<string>();

	if (omitWhenFeatureDisabled) {
		for (const [feature, keys] of Object.entries(omitWhenFeatureDisabled)) {
			const typedFeature = feature as AuthFeature;
			if (!isFeatureEnabled(typedFeature)) {
				keys.forEach((key) => disabledKeys.add(key));
			}
		}
	}

	return permissionDefinitions.filter(
		(definition) => !disabledKeys.has(definition.key),
	);
}
