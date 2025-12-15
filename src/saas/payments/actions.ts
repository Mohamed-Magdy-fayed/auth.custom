"use server";

import { redirect } from "next/navigation";
import { getAuthenticatedUser, getUserWithOrganization } from "@/saas/db/queries";

async function requireActiveOrganization() {
	const user = await getAuthenticatedUser();

	if (!user) {
		redirect("/sign-in");
	}

	const membership = await getUserWithOrganization(user.id);

	if (!membership?.organization) {
		redirect("/pricing");
	}

	return membership.organization;
}

export async function checkoutAction(formData: FormData) {
	void formData;
	await requireActiveOrganization();
	throw new Error("Billing is disabled for organization-only mode.");
}

export async function customerPortalAction() {
	await requireActiveOrganization();
	throw new Error("Billing is disabled for organization-only mode.");
}
