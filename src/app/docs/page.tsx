import { BookOpen } from "lucide-react";
import { DocsSearch } from "@/components/marketing/docs-search";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { Badge } from "@/components/ui/badge";
import { H1, H2, H3, InlineCode, Muted } from "@/components/ui/typography";
import { docsArticles } from "@/data/docs-content";

export default function DocsPage() {
    return (
        <MarketingLayout>
            <section className="bg-muted/30">
                <div className="container space-y-4 py-16 text-center">
                    <Badge
                        variant="outline"
                        className="mx-auto inline-flex items-center gap-2 rounded-full px-4 py-1 uppercase tracking-wide"
                    >
                        <BookOpen className="h-4 w-4" />
                        Documentation
                    </Badge>
                    <H1 className="text-4xl sm:text-5xl">Learn every part of the system</H1>
                    <Muted className="mx-auto max-w-3xl text-lg">
                        Searchable, developer-focused guides show how the authentication stack is
                        wired, where to configure features, and which screens to demo.
                    </Muted>
                </div>
            </section>
            <section className="container space-y-10 py-16">
                <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
                    <div className="rounded-3xl border bg-muted/20 p-6 text-left text-sm text-muted-foreground">
                        <p className="font-semibold text-foreground">Fast orientation</p>
                        <p className="mt-2">
                            Try searching for "passkeys", "billing", or "organizations" to jump right
                            into the relevant guide.
                        </p>
                        <p className="mt-4">
                            Guides link back into the live app so you can experience each flow
                            immediately.
                        </p>
                    </div>
                    <DocsSearch topics={docsArticles} />
                </div>
            </section>
            <section
                id="developer-guide"
                className="border-t border-border/60 bg-background py-16"
            >
                <div className="container grid gap-10 lg:grid-cols-[2fr_1fr]">
                    <div className="space-y-6 text-left">
                        <H2 className="border-none p-0 text-3xl">Developer integration guide</H2>
                        <Muted className="text-base">
                            Copy one folder, wire two touchpoints, and ship an enterprise-grade
                            authentication experience without rewriting anything.
                        </Muted>
                        <ol className="space-y-4 text-sm text-muted-foreground">
                            <li>
                                <p className="font-semibold text-foreground">
                                    1. Copy the auth module
                                </p>
                                <p>
                                    Drop the <InlineCode>src/auth</InlineCode> folder into your Next.js
                                    application. It already contains server actions, database tables, UI
                                    screens, and feature flags — no additional files required.
                                </p>
                            </li>
                            <li>
                                <p className="font-semibold text-foreground">
                                    2. Surface environment variables
                                </p>
                                <p>
                                    Mirror the keys defined in <InlineCode>src/data/env/server.ts</InlineCode>
                                    inside your own <InlineCode>.env.local</InlineCode>. The helper exports a
                                    single <InlineCode>env</InlineCode> object so you can read configuration from
                                    anywhere in your app.
                                </p>
                            </li>
                            <li>
                                <p className="font-semibold text-foreground">
                                    3. Enable middleware protection
                                </p>
                                <p>
                                    Re-export the provided middleware so protected routes, API handlers, and
                                    OAuth callbacks work immediately.
                                </p>
                                <pre className="mt-2 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs text-left text-muted-foreground">
                                    <code>{`// middleware.ts
export { authMiddleware as middleware } from "@/auth/nextjs/middleware";

export const config = {
    matcher: ["/app/:path*", "/dashboard/:path*", "/api/:path*"],
};`}</code>
                                </pre>
                            </li>
                            <li>
                                <p className="font-semibold text-foreground">
                                    4. Run the database sync
                                </p>
                                <p>
                                    Import <InlineCode>auth/tables/index.ts</InlineCode> into your Drizzle
                                    schema or execute the generated migrations so the sessions, tokens, and
                                    organization tables exist.
                                </p>
                                <pre className="mt-2 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs text-left text-muted-foreground">
                                    <code>{`# Example quickstart
pnpm drizzle-kit generate
pnpm drizzle-kit push`}</code>
                                </pre>
                            </li>
                        </ol>
                        <Muted>
                            Need a lighter touch? You can import individual helpers from
                            <InlineCode>@/auth</InlineCode> without copying UI components — the folder is
                            designed as a drop-in module.
                        </Muted>
                    </div>
                    <div className="space-y-5 rounded-3xl border bg-muted/15 p-6 text-sm text-muted-foreground">
                        <H3 className="text-foreground">What you get out of the box</H3>
                        <ul className="space-y-3">
                            <li>
                                <p>
                                    <span className="font-semibold text-foreground">Session aware UI.</span> The
                                    workspace shell, user menu, and settings dialogs are already wired to the
                                    session context.
                                </p>
                            </li>
                            <li>
                                <p>
                                    <span className="font-semibold text-foreground">Feature toggles.</span> Flip
                                    switches in <InlineCode>auth/config/features.ts</InlineCode> to enable
                                    passkeys, password policies, or OAuth providers.
                                </p>
                            </li>
                            <li>
                                <p>
                                    <span className="font-semibold text-foreground">Email + OAuth flows.</span>
                                    Server actions, token issuance, and React Email previews live in the same
                                    directory for quick edits.
                                </p>
                            </li>
                            <li>
                                <p>
                                    <span className="font-semibold text-foreground">Type-safe data layer.</span>
                                    Drizzle schemas and query helpers are preconfigured so you can extend them
                                    without touching raw SQL.
                                </p>
                            </li>
                        </ul>
                        <Muted>
                            The integration path stays reversible: remove the folder and your host app
                            reverts to its previous state.
                        </Muted>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
