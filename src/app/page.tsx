import { ArrowRight, Check, Sparkles, Star } from "lucide-react";
import Link from "next/link";

import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { H1, Muted, Small } from "@/components/ui/typography";

const FEATURE_BLOCKS = [
	{
		title: "Beautiful onboarding",
		description:
			"Email verification, password setup, and organization creation packed into a polished, responsive wizard.",
		tags: ["Email verification", "Organization bootstrap"],
	},
	{
		title: "Enterprise guardrails",
		description:
			"Sessions rotate automatically, passkeys are one toggle away, and permission logic ships with the database schema.",
		tags: ["Passkeys", "Session rotation", "RBAC"],
	},
	{
		title: "Team-ready billing",
		description:
			"Offer an always-free Community plan and optional Plus supporter tier backed by Stripe checkout and portal flows.",
		tags: ["Community tier", "Stripe", "Portal"],
	},
];

const JOURNEY_STEPS = [
	"Sign up and confirm your email — no credit card required.",
	"Invite teammates, add passkeys, and rotate sessions from the cockpit.",
	"Upgrade to the Plus supporter tier when you are ready to back the project.",
];

const TEST_DRIVE_CALLS = [
	{
		title: "Launch the sandbox",
		description:
			"Create your workspace and explore every feature without Stripe keys.",
		action: { label: "Create a free account", href: "/sign-up" },
	},
	{
		title: "Preview transactional emails",
		description:
			"Review verification, invite, and reset templates directly in the browser.",
		action: { label: "Open the email gallery", href: "/auth/nextjs/emails" },
	},
	{
		title: "Inspect session security",
		description:
			"See device history, revoke tokens, and add passkeys from the dashboard.",
		action: { label: "Visit the authenticated demo", href: "/sign-in" },
	},
];

export default function HomePage() {
	return (
		<MarketingLayout>
			<section className="bg-muted/40">
				<div className="container flex flex-col gap-12 py-20 lg:flex-row lg:items-center">
					<div className="flex-1 space-y-6">
						<div className="inline-flex items-center gap-2 rounded-full border border-dashed border-primary/40 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
							<Sparkles className="h-4 w-4" />
							Launch faster
						</div>
						<H1 className="text-balance text-4xl sm:text-5xl md:text-6xl">
							Ship a production-grade auth experience in an afternoon.
						</H1>
						<Muted className="max-w-xl text-lg">
							Gateling Auth bundles secure sign-in, organization management, billing, and
							documentation so you can focus on your product. Launch on the free tier,
							then let supporters back you with the Plus plan.
						</Muted>
						<div className="flex flex-wrap gap-3">
							<Button asChild size="lg" className="rounded-full">
								<Link href="/sign-up" className="flex items-center gap-2">
									Start for free
									<ArrowRight className="h-4 w-4" />
								</Link>
							</Button>
							<Button asChild variant="outline" size="lg" className="rounded-full">
								<Link href="/docs">Browse the docs</Link>
							</Button>
						</div>
						<div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
							<div className="flex items-center gap-2">
								<Star className="h-4 w-4 text-yellow-500" />
								Community tier stays free forever
							</div>
							<div className="flex items-center gap-2">
								<Check className="h-4 w-4 text-primary" />
								Full access without Stripe keys required
							</div>
						</div>
					</div>
					<div className="flex-1 rounded-3xl border bg-background p-6 shadow-xl">
						<div className="grid gap-4">
							<div className="rounded-2xl border bg-muted/30 p-4">
								<p className="text-sm font-medium text-muted-foreground">
									Your test drive checklist
								</p>
								<ul className="mt-4 space-y-3 text-sm text-muted-foreground">
									{JOURNEY_STEPS.map((item) => (
										<li key={item} className="flex items-start gap-2">
											<Check className="mt-0.5 h-4 w-4 text-primary" />
											<span>{item}</span>
										</li>
									))}
								</ul>
							</div>
							<div className="rounded-2xl border bg-background p-4">
								<p className="text-sm font-semibold text-foreground">
									Included in the free Community plan
								</p>
								<ul className="mt-3 space-y-2 text-sm text-muted-foreground">
									<li>Unlimited users and organizations</li>
									<li>Passkeys, OAuth, passwords, and session management</li>
									<li>Access to every feature flag and upcoming release</li>
								</ul>
							</div>
						</div>
					</div>
				</div>
			</section>
			<section className="container space-y-12 py-20">
				<div className="text-center space-y-3">
					<Badge
						variant="outline"
						className="rounded-full px-4 py-1 uppercase tracking-wide"
					>
						Why teams choose Gateling Auth
					</Badge>
					<H1 className="text-3xl sm:text-4xl">
						All the essentials, zero guesswork.
					</H1>
					<Muted className="mx-auto max-w-2xl">
						From onboarding to billing, every screen is wired to real server actions
						and backed by Drizzle ORM migrations. Connect your provider keys when you
						are ready — until then, safe demo data keeps the flow intact.
					</Muted>
				</div>
				<div className="grid gap-6 md:grid-cols-3">
					{FEATURE_BLOCKS.map((feature) => (
						<article
							key={feature.title}
							className="flex h-full flex-col rounded-2xl border bg-card p-6 text-left shadow-sm"
						>
							<h3 className="text-xl font-semibold text-foreground">
								{feature.title}
							</h3>
							<p className="mt-3 text-sm text-muted-foreground">
								{feature.description}
							</p>
							<div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
								{feature.tags.map((tag) => (
									<span key={tag} className="rounded-full border px-3 py-1">
										{tag}
									</span>
								))}
							</div>
						</article>
					))}
				</div>
			</section>
			<section className="bg-muted/30">
				<div className="container grid gap-8 py-20 md:grid-cols-2">
					<div className="space-y-4">
						<H1 className="text-3xl">Try the full product in minutes</H1>
						<Muted>
							Every environment can exercise sign up, reset, admin, and billing flows
							using safe demo data. No feature toggles hidden behind a paywall.
						</Muted>
					</div>
					<div className="grid gap-4">
						{TEST_DRIVE_CALLS.map((item) => (
							<div
								key={item.title}
								className="flex flex-col gap-3 rounded-2xl border bg-background p-6"
							>
								<div>
									<p className="text-sm font-semibold text-foreground">{item.title}</p>
									<p className="text-sm text-muted-foreground">{item.description}</p>
								</div>
								<Button
									asChild
									variant="ghost"
									className="justify-start px-0 text-primary"
								>
									<Link
										href={item.action.href}
										className="inline-flex items-center gap-2"
									>
										{item.action.label}
										<ArrowRight className="h-4 w-4" />
									</Link>
								</Button>
							</div>
						))}
					</div>
				</div>
			</section>
			<section className="container space-y-6 py-20 text-center">
				<Small className="uppercase tracking-wide text-muted-foreground">
					Make it yours
				</Small>
				<H1 className="text-3xl sm:text-4xl">
					Ready for production, friendly for tinkering
				</H1>
				<Muted className="mx-auto max-w-2xl">
					Deploy the repo, add your secrets, and invite customers today. Gateling Auth
					stays free for real projects — the optional Plus tier lets supporters fund
					the roadmap.
				</Muted>
				<div className="flex flex-wrap justify-center gap-3">
					<Button asChild size="lg" className="rounded-full">
						<Link href="/sign-up">Create your workspace</Link>
					</Button>
					<Button asChild variant="outline" size="lg" className="rounded-full">
						<Link href="/pricing">See supporter perks</Link>
					</Button>
				</div>
			</section>
		</MarketingLayout>
	);
}
