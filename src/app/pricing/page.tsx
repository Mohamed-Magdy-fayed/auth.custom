import { Check, Heart, Shield } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Muted, Small } from "@/components/ui/typography";
import { getT } from "@/lib/i18n/actions";
import { checkoutAction } from "@/saas/payments/actions";
import {
	getStripePrices,
	getStripeProducts,
	isStripeConfigured,
} from "@/saas/payments/stripe";

import { SubmitButton } from "./submit-button";

export const revalidate = 3600;

const FEATURE_KEYS: Record<string, string[]> = {
	community: [
		"pricingPage.features.community.0",
		"pricingPage.features.community.1",
		"pricingPage.features.community.2",
	],
	base: [
		"pricingPage.features.base.0",
		"pricingPage.features.base.1",
		"pricingPage.features.base.2",
	],
	plus: [
		"pricingPage.features.plus.0",
		"pricingPage.features.plus.1",
		"pricingPage.features.plus.2",
	],
};

type PlanDefinition = {
	id: string;
	name: string;
	description?: string | null;
	priceId: string | null;
	unitAmount: number | null;
	currency: string;
	interval: string | null;
	trialPeriodDays: number;
	features: string[];
	checkoutEnabled: boolean;
	highlight?: string;
	cta?: { href: string; label: string; variant?: "default" | "outline" };
};

type PlanLoadResult = {
	plans: PlanDefinition[];
	isFallback: boolean;
	fallbackReason: "not-configured" | "api-error" | null;
};

const COMMUNITY_PLAN: PlanDefinition = {
	id: "community",
	name: "pricingPage.plan.community",
	description: "pricingPage.plan.communityDescription",
	priceId: null,
	unitAmount: 0,
	currency: "usd",
	interval: "month",
	trialPeriodDays: 0,
	features: FEATURE_KEYS.community,
	checkoutEnabled: false,
	highlight: "pricingPage.plan.communityHighlight",
	cta: { href: "/sign-up", label: "pricingPage.plan.communityCta" },
};

const FALLBACK_PLANS: PlanDefinition[] = [
	{
		id: "demo-base",
		name: "pricingPage.plan.base",
		description: "pricingPage.plan.baseDescription",
		priceId: null,
		unitAmount: 800,
		currency: "usd",
		interval: "month",
		trialPeriodDays: 14,
		features: FEATURE_KEYS.base,
		checkoutEnabled: false,
		highlight: "pricingPage.plan.supporterHighlight",
	},
	{
		id: "demo-plus",
		name: "pricingPage.plan.plus",
		description: "pricingPage.plan.plusDescription",
		priceId: null,
		unitAmount: 1200,
		currency: "usd",
		interval: "month",
		trialPeriodDays: 14,
		features: FEATURE_KEYS.plus,
		checkoutEnabled: false,
		highlight: "pricingPage.plan.roadmapHighlight",
	},
];

export default async function PricingPage() {
	const { t, locale } = await getT();
	const dir = locale === "ar" ? "rtl" : "ltr";
	const stripeReady = isStripeConfigured();

	return (
		<MarketingLayout>
			<div dir={dir} lang={locale}>
				<section className="bg-muted/30">
					<div className="container grid gap-10 py-20 lg:grid-cols-[1.2fr_1fr] lg:items-center">
						<div className="space-y-5">
							<Badge
								variant="outline"
								className="rounded-full px-4 py-1 uppercase tracking-wide"
							>
								{t("pricingPage.hero.badge")}
							</Badge>
							<h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
								{t("pricingPage.hero.title")}
							</h1>
							<Muted className="max-w-2xl text-lg">
								{t("pricingPage.hero.subtitle")}
							</Muted>
							<div className="flex flex-wrap gap-3">
								<Button asChild size="lg" className="rounded-full">
									<Link href="/sign-up">{t("pricingPage.hero.primaryCta")}</Link>
								</Button>
								<Button asChild variant="outline" size="lg" className="rounded-full">
									<Link href="/docs">{t("pricingPage.hero.secondaryCta")}</Link>
								</Button>
							</div>
						</div>
						<div className="rounded-3xl border bg-background p-6 shadow-lg">
							<div className="flex items-start gap-3 text-sm">
								<Shield className="mt-1 h-5 w-5 text-primary" />
								<p className="text-muted-foreground">
									{t("pricingPage.hero.demoNotice")}
								</p>
							</div>
							<div className="mt-6 rounded-2xl border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
								<Small className="font-semibold text-foreground">
									{t("pricingPage.hero.supporterTitle")}
								</Small>
								<p className="mt-1 flex items-center gap-2">
									<Heart className="h-4 w-4 text-pink-500" />
									{t("pricingPage.hero.supporterBody")}
								</p>
							</div>
						</div>
					</div>
				</section>
				<section className="container mx-auto max-w-6xl py-20">
					<Suspense fallback={<PricingSkeleton />}>
						<PricingCards stripeReady={stripeReady} t={t} />
					</Suspense>
				</section>
				<section className="container max-w-4xl pb-24 text-center">
					<h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
						{t("pricingPage.value.title")}
					</h2>
					<Muted className="mx-auto mt-4 max-w-2xl">
						{t("pricingPage.value.subtitle")}
					</Muted>
					<div className="mt-10 grid gap-6 text-left sm:grid-cols-2">
						{[
							t("pricingPage.value.bullets.0"),
							t("pricingPage.value.bullets.1"),
							t("pricingPage.value.bullets.2"),
							t("pricingPage.value.bullets.3"),
							t("pricingPage.value.bullets.4"),
							t("pricingPage.value.bullets.5"),
						].map((item) => (
							<li
								key={item}
								className="flex items-start gap-3 text-sm text-muted-foreground"
							>
								<Check className="mt-0.5 h-4 w-4 text-primary" />
								<span>{item}</span>
							</li>
						))}
					</div>
				</section>
			</div>
		</MarketingLayout>
	);
}

async function PricingCards({
	stripeReady,
	t,
}: {
	stripeReady: boolean;
	t: Awaited<ReturnType<typeof getT>>["t"];
}) {
	const { plans, isFallback, fallbackReason } = await loadPlans(stripeReady, t);

	if (plans.length === 0) {
		return (
			<section className="rounded-xl border bg-muted/30 p-8 text-center">
				<h2 className="text-2xl font-semibold">{t("pricingPage.cards.empty.title")}</h2>
				<Muted className="mt-3 block">
					{t("pricingPage.cards.empty.body")}
				</Muted>
			</section>
		);
	}

	const sortedPlans = [...plans].sort(
		(a, b) =>
			(a.unitAmount ?? Number.MAX_SAFE_INTEGER) -
			(b.unitAmount ?? Number.MAX_SAFE_INTEGER),
	);

	return (
		<div className="space-y-6">
			{isFallback && <FallbackNotice reason={fallbackReason} t={t} />}
			<section className="grid gap-8 md:grid-cols-2">
				{sortedPlans.map((plan) => (
					<PricingCard key={plan.id} plan={plan} t={t} />
				))}
			</section>
		</div>
	);
}

async function loadPlans(
	stripeReady: boolean,
	_t: Awaited<ReturnType<typeof getT>>["t"],
): Promise<PlanLoadResult> {
	if (!stripeReady) {
		return {
			plans: [COMMUNITY_PLAN, ...FALLBACK_PLANS],
			isFallback: true,
			fallbackReason: "not-configured",
		};
	}

	try {
		const [prices, products] = await Promise.all([
			getStripePrices(),
			getStripeProducts(),
		]);

		const supporterPlans = products.map((product) => {
			const price =
				prices.find((entry) => entry.productId === product.id) ??
				prices.find((entry) => entry.id === product.defaultPriceId) ??
				null;

			const resolvedPriceId = price?.id ?? product.defaultPriceId ?? null;
			const normalizedName = product.name.toLowerCase();
			const featureKeys = FEATURE_KEYS[normalizedName] ?? [
				"pricingPage.features.default.0",
				"pricingPage.features.default.1",
				"pricingPage.features.default.2",
			];

			return {
				id: product.id,
				name: product.name,
				description: product.description,
				priceId: resolvedPriceId,
				unitAmount: price?.unitAmount ?? null,
				currency: price?.currency ?? "usd",
				interval: price?.interval ?? "month",
				trialPeriodDays: price?.trialPeriodDays ?? 14,
				features: featureKeys,
				checkoutEnabled: resolvedPriceId != null,
				highlight: normalizedName.includes("plus")
					? "pricingPage.plan.supporterHighlight"
					: undefined,
			};
		});

		return {
			plans: [COMMUNITY_PLAN, ...supporterPlans],
			isFallback: false,
			fallbackReason: null,
		};
	} catch (error) {
		console.warn(
			"Failed to load Stripe pricing data. Falling back to demo plans.",
			error,
		);
		return {
			plans: [COMMUNITY_PLAN, ...FALLBACK_PLANS],
			isFallback: true,
			fallbackReason: "api-error",
		};
	}
}

function PricingCard({
	plan,
	t,
}: {
	plan: PlanDefinition;
	t: Awaited<ReturnType<typeof getT>>["t"];
}) {
	const toKey = (key: string) => key as Parameters<typeof t>[0];

	const displayAmount =
		typeof plan.unitAmount === "number" ? plan.unitAmount : null;
	const canCheckout = plan.checkoutEnabled && typeof plan.priceId === "string";
	const isFree = displayAmount === 0;
	const disabledLabel = plan.checkoutEnabled
		? t("pricingPage.cards.disabled.contact")
		: t("pricingPage.cards.disabled.demo");
	const ctaVariant = plan.cta?.variant ?? "default";
	const featureList = plan.features.map((featureKey) => t(toKey(featureKey)));
	const planName = plan.name.startsWith("pricingPage")
		? t(toKey(plan.name))
		: plan.name;
	const planDescription =
		plan.description && plan.description.startsWith("pricingPage")
			? t(toKey(plan.description))
			: plan.description;
	const planHighlight = plan.highlight
		? plan.highlight.startsWith("pricingPage")
			? t(toKey(plan.highlight))
			: plan.highlight
		: undefined;
	const ctaLabel = plan.cta?.label
		? plan.cta.label.startsWith("pricingPage")
			? t(toKey(plan.cta.label))
			: plan.cta.label
		: undefined;

	return (
		<article className="flex h-full flex-col rounded-2xl border bg-background p-6 shadow-sm">
			<header className="space-y-3">
				<div className="flex items-center gap-2">
					<h2 className="text-2xl font-semibold tracking-tight">{planName}</h2>
					{planHighlight && <Badge>{planHighlight}</Badge>}
				</div>
				{planDescription && <Muted>{planDescription}</Muted>}
				<p className="text-4xl font-semibold">
					{displayAmount != null
						? displayAmount === 0
							? t("pricingPage.cards.price.free")
							: formatCurrency(displayAmount, plan.currency)
						: "—"}
					<span className="ml-2 text-sm font-normal text-muted-foreground">
						{isFree
							? t("pricingPage.cards.price.freeSuffix")
							: t("pricingPage.cards.price.interval", {
								interval: plan.interval ?? t("pricingPage.cards.price.period"),
							})}
					</span>
				</p>
				<Muted>
					{isFree
						? t("pricingPage.cards.price.freeCopy")
						: t("pricingPage.cards.price.trialCopy", { count: plan.trialPeriodDays })}
				</Muted>
			</header>
			<ul className="mt-6 space-y-3">
				{featureList.map((feature) => (
					<li key={feature} className="flex items-start gap-3 text-sm">
						<Check className="mt-0.5 h-4 w-4 text-primary" />
						<span>{feature}</span>
					</li>
				))}
			</ul>
			<div className="mt-auto pt-8">
				{canCheckout ? (
					<form action={checkoutAction} className="flex flex-col gap-3">
						<input type="hidden" name="priceId" value={plan.priceId ?? undefined} />
						<SubmitButton />
					</form>
				) : plan.cta ? (
					<Button
						asChild
						variant={ctaVariant === "outline" ? "outline" : "default"}
						className="w-full rounded-full"
					>
						<Link href={plan.cta.href}>{ctaLabel ?? plan.cta.label}</Link>
					</Button>
				) : (
					<Button disabled variant="outline" className="w-full rounded-full">
						{disabledLabel}
					</Button>
				)}
				<p className="mt-3 text-center text-sm text-muted-foreground">
					{t("pricingPage.cards.signInPrompt")}{" "}
					<Link href="/sign-in" className="underline">
						{t("pricingPage.cards.signInCta")}
					</Link>
				</p>
			</div>
		</article>
	);
}

function FallbackNotice({
	reason,
	t,
}: {
	reason: PlanLoadResult["fallbackReason"];
	t: Awaited<ReturnType<typeof getT>>["t"];
}) {
	const message =
		reason === "not-configured"
			? t("pricingPage.cards.fallback.notConfigured")
			: t("pricingPage.cards.fallback.apiError");

	const hint =
		reason === "not-configured"
			? t("pricingPage.cards.fallback.notConfiguredHint")
			: t("pricingPage.cards.fallback.apiErrorHint");

	return (
		<div className="rounded-lg border border-dashed border-yellow-400 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
			<p className="font-medium">{t("pricingPage.cards.fallback.title")}</p>
			<p className="mt-1">{message}</p>
			<p className="mt-1">{hint}</p>
		</div>
	);
}

function formatCurrency(value: number, currency: string) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: currency.toUpperCase(),
		maximumFractionDigits: 0,
	}).format(value / 100);
}

function PricingSkeleton() {
	return (
		<div className="grid gap-8 md:grid-cols-2">
			{Array.from({ length: 2 }).map((_, index) => (
				<div
					key={index}
					className="h-72 animate-pulse rounded-xl border bg-muted/40"
				/>
			))}
		</div>
	);
}
