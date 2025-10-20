import { Check, Heart, Shield } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Muted, Small } from "@/components/ui/typography";
import { checkoutAction } from "@/saas/payments/actions";
import {
    getStripePrices,
    getStripeProducts,
    isStripeConfigured,
} from "@/saas/payments/stripe";

import { SubmitButton } from "./submit-button";

export const revalidate = 3600;

const FEATURE_PRESETS: Record<string, string[]> = {
    community: [
        "Unlimited workspaces and members",
        "Email, passkeys, and OAuth sign-in",
        "Team management with role-based access",
    ],
    base: ["Unlimited usage", "Unlimited workspace members", "Email support"],
    plus: [
        "Everything in Community",
        "Early access to new features",
        "Priority support in our private Slack",
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
    name: "Community",
    description: "Everything you need to launch, always free.",
    priceId: null,
    unitAmount: 0,
    currency: "usd",
    interval: "month",
    trialPeriodDays: 0,
    features: FEATURE_PRESETS.community,
    checkoutEnabled: false,
    highlight: "Free forever",
    cta: { href: "/sign-up", label: "Sign up free" },
};

const FALLBACK_PLANS: PlanDefinition[] = [
    {
        id: "demo-base",
        name: "Base",
        description: "Essential access while you configure real Stripe credentials.",
        priceId: null,
        unitAmount: 800,
        currency: "usd",
        interval: "month",
        trialPeriodDays: 14,
        features: FEATURE_PRESETS.base,
        checkoutEnabled: false,
        highlight: "Supporter tier",
    },
    {
        id: "demo-plus",
        name: "Plus",
        description: "Advanced collaboration and priority support for growing teams.",
        priceId: null,
        unitAmount: 1200,
        currency: "usd",
        interval: "month",
        trialPeriodDays: 14,
        features: FEATURE_PRESETS.plus,
        checkoutEnabled: false,
        highlight: "Fund the roadmap",
    },
];

export default async function PricingPage() {
    const stripeReady = isStripeConfigured();

    return (
        <MarketingLayout>
            <section className="bg-muted/30">
                <div className="container grid gap-10 py-20 lg:grid-cols-[1.2fr_1fr] lg:items-center">
                    <div className="space-y-5">
                        <Badge variant="outline" className="rounded-full px-4 py-1 uppercase tracking-wide">
                            Pricing built for community projects
                        </Badge>
                        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                            Start free. Invite your team. Support the project when you are ready.
                        </h1>
                        <Muted className="max-w-2xl text-lg">
                            Auth.custom ships with a generous free tier that unlocks the complete
                            authentication experience. When you want to back continued development,
                            upgrade to Plus and unlock priority support.
                        </Muted>
                        <div className="flex flex-wrap gap-3">
                            <Button asChild size="lg" className="rounded-full">
                                <Link href="/sign-up">Create a free workspace</Link>
                            </Button>
                            <Button asChild variant="outline" size="lg" className="rounded-full">
                                <Link href="/docs">Explore the docs</Link>
                            </Button>
                        </div>
                    </div>
                    <div className="rounded-3xl border bg-background p-6 shadow-lg">
                        <div className="flex items-start gap-3 text-sm">
                            <Shield className="mt-1 h-5 w-5 text-primary" />
                            <p className="text-muted-foreground">
                                No Stripe keys yet? No problem — we render safe demo plans until you
                                add credentials. Your testers can still experience the full checkout
                                flow end-to-end.
                            </p>
                        </div>
                        <div className="mt-6 rounded-2xl border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
                            <Small className="font-semibold text-foreground">Supporters welcome</Small>
                            <p className="mt-1 flex items-center gap-2">
                                <Heart className="h-4 w-4 text-pink-500" />
                                100% of Plus revenue funds new tutorials, components, and advanced
                                integrations.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
            <section className="container mx-auto max-w-6xl py-20">
                <Suspense fallback={<PricingSkeleton />}>
                    <PricingCards stripeReady={stripeReady} />
                </Suspense>
            </section>
            <section className="container max-w-4xl pb-24 text-center">
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Everything stays unlocked on the free plan
                </h2>
                <Muted className="mx-auto mt-4 max-w-2xl">
                    Both plans ship with the same authentication capabilities. The Plus tier is
                    purely a way to thank the maintainers and receive concierge support.
                </Muted>
                <div className="mt-10 grid gap-6 text-left sm:grid-cols-2">
                    {[
                        "Unlimited organizations, teams, and members",
                        "Passkeys, OAuth, magic links, and passwords",
                        "Fine-grained roles with Drizzle-managed schema",
                        "Production-ready email templates and queues",
                        "Session history with one-click revocation",
                        "Stripe upgrade path for supporters",
                    ].map((item) => (
                        <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                            <Check className="mt-0.5 h-4 w-4 text-primary" />
                            <span>{item}</span>
                        </li>
                    ))}
                </div>
            </section>
        </MarketingLayout>
    );
}

async function PricingCards({ stripeReady }: { stripeReady: boolean }) {
    const { plans, isFallback, fallbackReason } = await loadPlans(stripeReady);

    if (plans.length === 0) {
        return (
            <section className="rounded-xl border bg-muted/30 p-8 text-center">
                <h2 className="text-2xl font-semibold">No plans available</h2>
                <Muted className="mt-3 block">
                    Create products and recurring prices in Stripe, then refresh this page to
                    display them here.
                </Muted>
            </section>
        );
    }

    const sortedPlans = [...plans].sort(
        (a, b) => (a.unitAmount ?? Number.MAX_SAFE_INTEGER) - (b.unitAmount ?? Number.MAX_SAFE_INTEGER),
    );

    return (
        <div className="space-y-6">
            {isFallback && <FallbackNotice reason={fallbackReason} />}
            <section className="grid gap-8 md:grid-cols-2">
                {sortedPlans.map((plan) => (
                    <PricingCard key={plan.id} plan={plan} />
                ))}
            </section>
        </div>
    );
}

async function loadPlans(stripeReady: boolean): Promise<PlanLoadResult> {
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
            const features = FEATURE_PRESETS[normalizedName] ?? [
                "Full access to the core feature set",
                "Invite unlimited team members",
                "Cancel or switch plans at any time",
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
                features,
                checkoutEnabled: resolvedPriceId != null,
                highlight: normalizedName.includes("plus") ? "Supporter tier" : undefined,
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

function PricingCard({ plan }: { plan: PlanDefinition }) {
    const displayAmount =
        typeof plan.unitAmount === "number" ? plan.unitAmount : null;
    const canCheckout = plan.checkoutEnabled && typeof plan.priceId === "string";
    const isFree = displayAmount === 0;
    const disabledLabel = plan.checkoutEnabled ? "Contact us" : "Demo mode";
    const ctaVariant = plan.cta?.variant ?? "default";

    return (
        <article className="flex h-full flex-col rounded-2xl border bg-background p-6 shadow-sm">
            <header className="space-y-3">
                <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-semibold tracking-tight">{plan.name}</h2>
                    {plan.highlight && <Badge>{plan.highlight}</Badge>}
                </div>
                {plan.description && <Muted>{plan.description}</Muted>}
                <p className="text-4xl font-semibold">
                    {displayAmount != null
                        ? displayAmount === 0
                            ? "Free"
                            : formatCurrency(displayAmount, plan.currency)
                        : "—"}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                        {isFree ? "for everything" : `per ${plan.interval ?? "billing period"}`}
                    </span>
                </p>
                <Muted>
                    {isFree
                        ? "Includes every feature, no credit card required."
                        : `Includes a ${plan.trialPeriodDays}-day free trial. Cancel anytime.`}
                </Muted>
            </header>
            <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
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
                        <Link href={plan.cta.href}>{plan.cta.label}</Link>
                    </Button>
                ) : (
                    <Button disabled variant="outline" className="w-full rounded-full">
                        {disabledLabel}
                    </Button>
                )}
                <p className="mt-3 text-center text-sm text-muted-foreground">
                    Already using auth.custom?{" "}
                    <Link href="/sign-in" className="underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </article>
    );
}

function FallbackNotice({
    reason,
}: {
    reason: PlanLoadResult["fallbackReason"];
}) {
    const message =
        reason === "not-configured"
            ? "Stripe credentials are not configured. Showing demo pricing instead."
            : "Stripe API requests failed. Showing demo pricing until the key is fixed.";

    const hint =
        reason === "not-configured"
            ? "Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in your environment, then restart the server to load live plans."
            : "Double-check your Stripe API key and network connectivity, then reload this page.";

    return (
        <div className="rounded-lg border border-dashed border-yellow-400 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
            <p className="font-medium">Demo pricing preview</p>
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
