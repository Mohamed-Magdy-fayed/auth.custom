import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { TeamsTable } from "@/auth/tables";
import { db } from "@/drizzle/db";
import { getUserWithTeam, logActivity } from "@/saas/db/queries";
import { stripe } from "@/saas/payments/stripe";
import { ActivityType } from "@/saas/tables/activity-logs-table";

export async function GET(request: NextRequest) {
	const sessionId = request.nextUrl.searchParams.get("session_id");

	if (!sessionId) {
		return NextResponse.redirect(new URL("/pricing", request.url));
	}

	if (!stripe) {
		console.error("Stripe is not configured");
		return NextResponse.redirect(new URL("/error", request.url));
	}

	try {
		const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
			expand: ["customer", "subscription"],
		});

		if (
			!checkoutSession.customer ||
			typeof checkoutSession.customer === "string"
		) {
			throw new Error("Invalid customer data from Stripe.");
		}

		const subscriptionId =
			typeof checkoutSession.subscription === "string"
				? checkoutSession.subscription
				: checkoutSession.subscription?.id;

		if (!subscriptionId) {
			throw new Error("No subscription found for this session.");
		}

		const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
			expand: ["items.data.price.product"],
		});

		const price = subscription.items.data[0]?.price;

		if (!price) {
			throw new Error("No price found for this subscription.");
		}

		const productId =
			typeof price.product === "string" ? price.product : price.product.id;

		const planName =
			typeof price.product === "string"
				? (price.nickname ?? null)
				: price.product.deleted
					? null
					: price.product.name;

		const userId = checkoutSession.client_reference_id;
		if (!userId) {
			throw new Error("No user ID found in the checkout session.");
		}

		const teamContext = await getUserWithTeam(userId);
		const teamId = teamContext?.teamId;

		if (!teamId) {
			throw new Error("User is not associated with any team.");
		}

		await db
			.update(TeamsTable)
			.set({
				stripeCustomerId: checkoutSession.customer.id,
				stripeSubscriptionId: subscriptionId,
				stripeProductId: productId,
				planName,
				subscriptionStatus: subscription.status,
				updatedAt: new Date(),
			})
			.where(eq(TeamsTable.id, teamId));

		const forwardedFor = request.headers.get("x-forwarded-for");
		const ipAddress =
			forwardedFor?.split(",")[0]?.trim() ??
			request.headers.get("x-real-ip") ??
			undefined;

		await logActivity(teamId, userId, ActivityType.UPDATE_ACCOUNT, ipAddress);

		return NextResponse.redirect(new URL("/dashboard", request.url));
	} catch (error) {
		console.error("Error handling successful checkout:", error);
		return NextResponse.redirect(new URL("/error", request.url));
	}
}
