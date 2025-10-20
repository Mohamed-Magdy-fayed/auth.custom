import Link from "next/link";
import { SessionList } from "@/auth/nextjs/components/SessionList";
import { UserMenu } from "@/components/generale/UserMenu";
import { Button } from "@/components/ui/button";
import { H1, Muted, Small } from "@/components/ui/typography";

import { loadAppContext } from "../load-app-context";

export default async function SessionsPage() {
    const context = await loadAppContext();

    return (
        <div className="flex min-h-screen flex-col bg-muted/10">
            <header className="border-b bg-background">
                <div className="container flex h-16 items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/app" className="font-semibold tracking-tight">
                            auth.custom
                        </Link>
                        <Small className="hidden border-l pl-3 text-muted-foreground sm:inline-block">
                            Security center
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
            <main className="container flex flex-1 flex-col gap-8 py-16">
                <div className="space-y-2">
                    <H1 className="text-3xl">Active sessions</H1>
                    <Muted className="max-w-2xl">
                        Review every logged-in device, revoke stale sessions, and confirm session
                        rotation is working as expected.
                    </Muted>
                </div>
                <section>
                    <SessionList />
                </section>
                <div className="rounded-lg border bg-background/70 p-6 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Next steps</p>
                    <ul className="mt-3 space-y-2">
                        <li>
                            <Button asChild variant="link" className="h-auto px-0 text-primary">
                                <Link href="/app">Return to workspace home</Link>
                            </Button>
                        </li>
                        <li>
                            <Button asChild variant="link" className="h-auto px-0 text-primary">
                                <Link href="/pricing">Support the project</Link>
                            </Button>
                        </li>
                    </ul>
                </div>
            </main>
        </div>
    );
}
