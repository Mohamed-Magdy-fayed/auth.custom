import Link from "next/link";

import { UserMenu } from "@/components/generale/UserMenu";
import { Button } from "@/components/ui/button";
import { H1, Muted, Small } from "@/components/ui/typography";

import { loadAppContext } from "./load-app-context";

export default async function AppHomePage() {
    const context = await loadAppContext();

    return (
        <div className="flex min-h-screen flex-col bg-muted/10">
            <header className="border-b bg-background">
                <div className="container flex h-16 items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/app" className="font-semibold tracking-tight">
                            Gateling Auth
                        </Link>
                        <Small className="hidden border-l pl-3 text-muted-foreground sm:inline-block">
                            Workspace cockpit
                        </Small>
                    </div>
                    <UserMenu
                        name={context.profileName}
                        profileName={context.profileName}
                        email={context.fullUser.email}
                        avatarUrl={null}
                        initials={context.initials}
                        emailVerified={context.emailVerified}
                        hasPassword={context.hasPassword}
                        passkeys={context.passkeys}
                        organizations={context.organizations}
                        teamData={context.teamData}
                    />
                </div>
            </header>
            <main className="container flex flex-1 flex-col justify-center gap-8 py-16">
                <div className="space-y-4">
                    <H1 className="max-w-2xl">
                        Welcome back, {context.profileName}. Manage everything from the menu in the top
                        bar.
                    </H1>
                    <Muted className="max-w-xl">
                        Use the account dropdown to update your profile, rotate credentials, and
                        review security preferences without leaving this page.
                    </Muted>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Button asChild variant="secondary">
                        <Link href="/dashboard">Open dashboard</Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/pricing">Support the project</Link>
                    </Button>
                    {context.isAdmin && (
                        <Button asChild variant="outline">
                            <Link href="/admin">Admin area</Link>
                        </Button>
                    )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border bg-background/70 p-6 text-sm text-muted-foreground">
                        <p>
                            Signed in as <span className="font-medium">{context.currentSessionUser.id}</span>
                            with role <span className="font-medium">{context.currentSessionUser.role}</span>.
                        </p>
                        <p className="mt-3">
                            Use the team switcher to explore multi-tenant workflows. Invite a
                            friend and test role changes live.
                        </p>
                    </div>
                    <div className="rounded-lg border bg-background/70 p-6 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">Try these next</p>
                        <ul className="mt-3 space-y-2">
                            <li>
                                <Link href="/app/sessions" className="underline">
                                    View active sessions
                                </Link>
                            </li>
                            <li>
                                <Link href="/auth/nextjs/emails" className="underline">
                                    Preview transactional emails
                                </Link>
                            </li>
                            <li>
                                <Link href="/pricing" className="underline">
                                    Explore supporter perks
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>
            </main>
        </div>
    );
}
