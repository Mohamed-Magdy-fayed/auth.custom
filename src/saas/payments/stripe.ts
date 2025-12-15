import { redirect } from "next/navigation";
import Stripe from "stripe";
import { env } from "@/data/env/server";

const stripeClient = env.STRIPE_SECRET_KEY
	? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2025-09-30.clover" })
	: null;

export function isStripeConfigured() {
	return false;
}

function requireStripe(): Stripe {
	if (!stripeClient) {
		throw new Error("Stripe is not configured for this deployment");
	}

	return stripeClient;
}

export async function createCheckoutSession({ priceId }: { priceId: string }) {
	void priceId;
	redirect("/pricing");
}

export async function createCustomerPortalSession() {
	redirect("/pricing");
}

export async function handleSubscriptionChange(_subscription: Stripe.Subscription) {
	console.warn("Stripe subscriptions are disabled in organization-only mode.");
}

export async function getStripePrices() {
	return [] as StripePrice[];
}

export async function getStripeProducts() {
	return [] as StripeProduct[];
}

export { stripeClient as stripe };

export type StripePrice = {
	id: string;
	productId: string;
	unitAmount: number | null;
	currency: string;
	interval: string | null;
	trialPeriodDays: number | null;
};

export type StripeProduct = {
	id: string;
	name: string;
	description: string | null;
	defaultPriceId: string | null;
};
