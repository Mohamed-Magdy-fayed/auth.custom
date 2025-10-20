import { Check, Cpu, Fingerprint, Layers, Link2, Users } from "lucide-react";
import Link from "next/link";

import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { H1, Muted, Small } from "@/components/ui/typography";

const CORE_FEATURES = [
    {
        icon: Users,
        title: "Multi-tenant workspaces",
        description:
            "Organizations, teams, and role assignments are baked into the data model. Switch context instantly from the top-right menu.",
        bullets: [
            "Invite unlimited members to any workspace",
            "Owner, admin, and custom roles configured in code",
            "Activity-aware session revocation keeps auditors happy",
        ],
    },
    {
        icon: Fingerprint,
        title: "Modern authentication options",
        description:
            "Ship sign-in choices your users expect: email/password, passkeys, OAuth, and magic links — all wired to secure server actions.",
        bullets: [
            "Passkeys are one feature flag away",
            "Password resets issue short-lived, database-backed tokens",
            "OAuth providers plug in via the actions layer",
        ],
    },
    {
        icon: Cpu,
        title: "Edge-aware session engine",
        description:
            "Rotating session tokens, httpOnly cookies, and device insights ensure resilient access control across browsers and native apps.",
        bullets: [
            "Sessions table powered by Drizzle ORM",
            "Revoke individual devices or sign out everywhere",
            "Audit trails for security reviews",
        ],
    },
];

const ENHANCEMENTS = [
    {
        icon: Layers,
        title: "Flexible feature flags",
        description:
            "Toggle modules like passkeys, passwordless, and organization invitations per environment without redeploying.",
    },
    {
        icon: Link2,
        title: "Inbound & outbound email",
        description:
            "React Email templates ship for verification, invites, resets, and security alerts. Swap transports in one file.",
    },
];

export default function FeaturesPage() {
    return (
        <MarketingLayout>
            <section className="bg-muted/30">
                <div className="container space-y-6 py-20 text-center">
                    <Badge variant="outline" className="rounded-full px-4 py-1 uppercase tracking-wide">
                        Platform overview
                    </Badge>
                    <H1 className="text-4xl sm:text-5xl">Everything a modern SaaS needs to run auth</H1>
                    <Muted className="mx-auto max-w-3xl text-lg">
                        Auth.custom is more than login. It is a complete user lifecycle with security best practices, multi-tenant management, billing, and documentation — ready for production on day one.
                    </Muted>
                    <div className="flex flex-wrap justify-center gap-3">
                        <Button asChild size="lg" className="rounded-full">
                            <Link href="/sign-up">Start for free</Link>
                        </Button>
                        <Button asChild variant="outline" size="lg" className="rounded-full">
                            <Link href="/pricing">See supporter perks</Link>
                        </Button>
                    </div>
                </div>
            </section>
            <section className="container space-y-12 py-20">
                {CORE_FEATURES.map((feature) => (
                    <div key={feature.title} className="grid gap-6 rounded-3xl border bg-background p-8 shadow-sm md:grid-cols-[0.4fr_1fr] md:items-start">
                        <div className="flex items-center gap-3 text-left md:flex-col md:items-start">
                            <feature.icon className="h-10 w-10 text-primary" />
                            <div>
                                <h2 className="text-2xl font-semibold text-foreground">{feature.title}</h2>
                                <Muted>{feature.description}</Muted>
                            </div>
                        </div>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            {feature.bullets.map((bullet) => (
                                <li key={bullet} className="flex items-start gap-3">
                                    <Check className="mt-0.5 h-4 w-4 text-primary" />
                                    <span>{bullet}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </section>
            <section className="bg-muted/20">
                <div className="container grid gap-8 py-20 md:grid-cols-2">
                    <div className="space-y-4">
                        <Small className="uppercase tracking-wide text-muted-foreground">
                            Built-in enhancements
                        </Small>
                        <H1 className="text-3xl">Production niceties included</H1>
                        <Muted>
                            Bring your favorite database, transport, or UI toolkit. Auth.custom handles the plumbing so you can focus on customer-facing work.
                        </Muted>
                    </div>
                    <div className="grid gap-6">
                        {ENHANCEMENTS.map((item) => (
                            <div key={item.title} className="flex gap-4 rounded-2xl border bg-background p-6">
                                <item.icon className="mt-1 h-8 w-8 text-primary" />
                                <div>
                                    <p className="text-lg font-semibold text-foreground">{item.title}</p>
                                    <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
