"use server";

import { redirect } from "next/navigation";
import type { TeamRecord } from "@/saas/db/queries";
import { getAuthenticatedUser, getUserWithTeam } from "@/saas/db/queries";
import {
	createCheckoutSession,
	createCustomerPortalSession,
} from "@/saas/payments/stripe";

async function requireActiveTeam(): Promise<TeamRecord> {
	const user = await getAuthenticatedUser();

	if (!user) {
		redirect("/sign-in");
	}

	const membership = await getUserWithTeam(user.id);

	if (!membership?.team) {
		redirect("/sign-in");
	}

	return membership.team;
}

export async function checkoutAction(formData: FormData) {
	const priceId = formData.get("priceId");

	if (typeof priceId !== "string" || priceId.length === 0) {
		throw new Error("Missing Stripe price identifier for checkout");
	}

	const team = await requireActiveTeam();

	await createCheckoutSession({ team, priceId });
}

export async function customerPortalAction() {
	const team = await requireActiveTeam();

	if (!team.stripeCustomerId) {
		throw new Error("Team does not have an associated Stripe customer");
	}

	const portalSession = await createCustomerPortalSession(team);
	redirect(portalSession.url);
}
