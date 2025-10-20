import { redirect } from "next/navigation";
import Stripe from "stripe";
import { env } from "@/data/env/server";
import type { TeamRecord } from "@/saas/db/queries";
import {
	getAuthenticatedUser,
	getTeamByStripeCustomerId,
	updateTeamSubscription,
} from "@/saas/db/queries";

const stripeClient = env.STRIPE_SECRET_KEY
	? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2025-09-30.clover" })
	: null;

export function isStripeConfigured() {
	return stripeClient != null;
}

function requireStripe(): Stripe {
	if (!stripeClient) {
		throw new Error("Stripe is not configured for this deployment");
	}

	return stripeClient;
}

export async function createCheckoutSession({
	team,
	priceId,
}: {
	team: TeamRecord | null;
	priceId: string;
}) {
	const user = await getAuthenticatedUser();

	if (!team || !user) {
		redirect(`/sign-up?redirect=checkout&priceId=${priceId}`);
	}

	const stripe = requireStripe();

	const session = await stripe.checkout.sessions.create({
		payment_method_types: ["card"],
		line_items: [{ price: priceId, quantity: 1 }],
		mode: "subscription",
		success_url: `${env.BASE_URL}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}`,
		cancel_url: `${env.BASE_URL}/pricing`,
		customer: team.stripeCustomerId ?? undefined,
		client_reference_id: user.id,
		allow_promotion_codes: true,
		subscription_data: { trial_period_days: 14 },
	});

	if (!session.url) {
		throw new Error("Stripe checkout session did not provide a redirect URL");
	}

	redirect(session.url);
}

export async function createCustomerPortalSession(team: TeamRecord) {
	const stripe = requireStripe();

	if (!team.stripeCustomerId || !team.stripeProductId) {
		redirect("/pricing");
	}

	let configuration: Stripe.BillingPortal.Configuration;
	const configurations = await stripe.billingPortal.configurations.list();

	if (configurations.data.length > 0) {
		configuration = configurations.data[0];
	} else {
		const product = await stripe.products.retrieve(team.stripeProductId);
		if (!product.active) {
			throw new Error("Team's product is not active in Stripe");
		}

		const prices = await stripe.prices.list({
			product: product.id,
			active: true,
		});

		if (prices.data.length === 0) {
			throw new Error("No active prices found for the team's product");
		}

		configuration = await stripe.billingPortal.configurations.create({
			business_profile: { headline: "Manage your subscription" },
			features: {
				subscription_update: {
					enabled: true,
					default_allowed_updates: ["price", "quantity", "promotion_code"],
					proration_behavior: "create_prorations",
					products: [
						{ product: product.id, prices: prices.data.map((price) => price.id) },
					],
				},
				subscription_cancel: {
					enabled: true,
					mode: "at_period_end",
					cancellation_reason: {
						enabled: true,
						options: [
							"too_expensive",
							"missing_features",
							"switched_service",
							"unused",
							"other",
						],
					},
				},
				payment_method_update: { enabled: true },
			},
		});
	}

	return stripe.billingPortal.sessions.create({
		customer: team.stripeCustomerId,
		return_url: `${env.BASE_URL}/dashboard`,
		configuration: configuration.id,
	});
}

export async function handleSubscriptionChange(
	subscription: Stripe.Subscription,
) {
	requireStripe();
	const customerId = subscription.customer as string;
	const subscriptionId = subscription.id;
	const status = subscription.status;

	const team = await getTeamByStripeCustomerId(customerId);

	if (!team) {
		console.error("Team not found for Stripe customer:", customerId);
		return;
	}

	if (status === "active" || status === "trialing") {
		const price = subscription.items.data[0]?.price ?? null;
		const productId = price
			? typeof price.product === "string"
				? price.product
				: price.product.id
			: null;
		const planName = price
			? typeof price.product === "string"
				? (price.nickname ?? null)
				: price.product.deleted
					? null
					: price.product.name
			: null;

		await updateTeamSubscription(team.id, {
			stripeSubscriptionId: subscriptionId,
			stripeProductId: productId,
			planName,
			subscriptionStatus: status,
		});
	} else if (status === "canceled" || status === "unpaid") {
		await updateTeamSubscription(team.id, {
			stripeSubscriptionId: null,
			stripeProductId: null,
			planName: null,
			subscriptionStatus: status,
		});
	}
}

export async function getStripePrices() {
	const stripe = requireStripe();

	const prices = await stripe.prices.list({
		expand: ["data.product"],
		active: true,
		type: "recurring",
	});

	return prices.data.map((price) => ({
		id: price.id,
		productId:
			typeof price.product === "string" ? price.product : price.product.id,
		unitAmount: price.unit_amount,
		currency: price.currency,
		interval: price.recurring?.interval,
		trialPeriodDays: price.recurring?.trial_period_days,
	}));
}

export async function getStripeProducts() {
	const stripe = requireStripe();

	const products = await stripe.products.list({
		active: true,
		expand: ["data.default_price"],
	});

	return products.data.map((product) => ({
		id: product.id,
		name: product.name,
		description: product.description,
		defaultPriceId:
			typeof product.default_price === "string"
				? product.default_price
				: product.default_price?.id,
	}));
}

export { stripeClient as stripe };
