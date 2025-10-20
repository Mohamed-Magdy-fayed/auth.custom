import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { env } from "@/data/env/server";
import { handleSubscriptionChange, stripe } from "@/saas/payments/stripe";

export async function POST(request: NextRequest) {
	if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
		return NextResponse.json(
			{ error: "Stripe is not configured" },
			{ status: 500 },
		);
	}

	const signature = request.headers.get("stripe-signature");
	if (!signature) {
		return NextResponse.json(
			{ error: "Missing stripe-signature header" },
			{ status: 400 },
		);
	}

	const payload = await request.text();

	let event: Stripe.Event;

	try {
		event = stripe.webhooks.constructEvent(
			payload,
			signature,
			env.STRIPE_WEBHOOK_SECRET,
		);
	} catch (error) {
		console.error("Webhook signature verification failed.", error);
		return NextResponse.json(
			{ error: "Webhook signature verification failed." },
			{ status: 400 },
		);
	}

	switch (event.type) {
		case "customer.subscription.updated":
		case "customer.subscription.deleted":
			await handleSubscriptionChange(event.data.object as Stripe.Subscription);
			break;
		default:
			console.log(`Unhandled Stripe event type ${event.type}`);
	}

	return NextResponse.json({ received: true });
}
