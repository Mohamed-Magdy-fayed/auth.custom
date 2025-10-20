import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/nextjs/currentUser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Muted, Small } from "@/components/ui/typography";
import {
    getPendingInvitations,
    getRecentTeamActivity,
    getRecentTeamMembers,
    getTeamDashboardStats,
    getUserWithTeam,
} from "@/saas/db/queries";
import { customerPortalAction } from "@/saas/payments/actions";
import { ManageSubscriptionButton } from "./manage-subscription-button";

export default async function DashboardPage() {
    const user = await getCurrentUser({
        redirectIfNotFound: true,
        withFullUser: true,
    });
    const membership = await getUserWithTeam(user.id);

    if (!membership?.team) {
        redirect("/pricing");
    }

    const team = membership.team;
    const hasCustomerRecord = Boolean(team.stripeCustomerId);
    const subscriptionStatus = team.subscriptionStatus ?? "inactive";
    const onCommunityPlan = !hasCustomerRecord;
    const planName = onCommunityPlan ? "Community" : team.planName ?? "Free";
    const hasActiveSubscription =
        onCommunityPlan || ["active", "trialing"].includes(subscriptionStatus);
    const statusLabel = onCommunityPlan
        ? "Active"
        : formatStatus(subscriptionStatus);

    const [stats, recentMembers, pendingInvites, recentActivity] =
        await Promise.all([
            getTeamDashboardStats(team.id),
            getRecentTeamMembers(team.id),
            getPendingInvitations(team.id),
            getRecentTeamActivity(team.id),
        ]);

    const createdLabel = formatDate(team.createdAt, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
    const lastUpdatedLabel = formatDate(team.updatedAt);

    const metricCards = [
        { label: "Active members", value: stats.activeMembers.toString() },
        { label: "Pending invites", value: stats.pendingInvites.toString() },
        { label: "Managers", value: stats.managerCount.toString() },
        { label: "Team created", value: createdLabel },
    ];

    return (
        <main className="container mx-auto max-w-5xl space-y-8 py-12">
            <header className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight">Team overview</h1>
                <Muted>
                    Monitor membership, invites, and billing status for your workspace.
                </Muted>
            </header>

            <Card>
                <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-3 text-2xl">
                            {planName}
                            <Badge variant={hasActiveSubscription ? "default" : "secondary"}>
                                {statusLabel}
                            </Badge>
                        </CardTitle>
                        <Muted>
                            Team {team.name} • Subscription ID {team.stripeSubscriptionId ?? "—"}
                        </Muted>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {hasCustomerRecord ? (
                            <form action={customerPortalAction}>
                                <ManageSubscriptionButton variant="default" />
                            </form>
                        ) : (
                            <Button asChild>
                                <Link href="/pricing">Support the project</Link>
                            </Button>
                        )}
                        <Button asChild variant="outline">
                            <Link href="/app/sessions">View active sessions</Link>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                    {onCommunityPlan ? (
                        <p>
                            You are on the free Community tier. Every feature of the authentication
                            stack is unlocked — upgrade to Plus only when you want to fund
                            continued development.
                        </p>
                    ) : (
                        <>
                            <p>
                                Status synced from Stripe. Active and trialing subscriptions grant
                                premium features immediately.
                            </p>
                            <ul className="list-disc space-y-2 pl-5">
                                <li>Stripe customer ID: {team.stripeCustomerId ?? "—"}</li>
                                <li>Stripe product ID: {team.stripeProductId ?? "—"}</li>
                                <li>Plan last updated: {lastUpdatedLabel}</li>
                            </ul>
                        </>
                    )}
                </CardContent>
                <CardContent className="border-t border-border/60 pt-6">
                    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {metricCards.map((metric) => (
                            <div key={metric.label} className="rounded-lg border bg-muted/40 p-4">
                                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    {metric.label}
                                </dt>
                                <dd className="mt-2 text-2xl font-semibold text-foreground">
                                    {metric.value}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </CardContent>
            </Card>

            <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">Recent members</CardTitle>
                        <Muted>Newest teammates with join dates and roles.</Muted>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {recentMembers.length > 0 ? (
                            <ul className="space-y-4">
                                {recentMembers.map((member) => (
                                    <li
                                        key={member.userId}
                                        className="flex items-start justify-between gap-4 rounded-lg border p-4"
                                    >
                                        <div>
                                            <p className="font-medium text-foreground">
                                                {member.name ?? "Unknown member"}
                                            </p>
                                            <Small className="block text-muted-foreground">
                                                {member.email ?? "—"}
                                            </Small>
                                        </div>
                                        <div className="text-right text-xs text-muted-foreground">
                                            <p>{member.isManager ? "Manager" : "Member"}</p>
                                            <p className="mt-1">
                                                Joined {formatRelativeDate(member.joinedAt ?? null)}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <Muted>No active members yet. Use the avatar menu to invite teammates.</Muted>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">Pending invites</CardTitle>
                        <Muted>Invite links waiting for acceptance.</Muted>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {pendingInvites.length > 0 ? (
                            <ul className="space-y-3 text-sm text-muted-foreground">
                                {pendingInvites.map((invite) => (
                                    <li key={`${invite.email}-${invite.invitedAt?.toString()}`} className="rounded-lg border bg-muted/40 p-3">
                                        <p className="font-medium text-foreground">{invite.email}</p>
                                        <p>
                                            Role: {formatRole(invite.roleKey)} · Invited {formatRelativeDate(invite.invitedAt)}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <Muted>Looks like everyone has joined. Send more invites from the workspace menu.</Muted>
                        )}
                    </CardContent>
                </Card>
            </section>

            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">Recent activity</CardTitle>
                    <Muted>Key authentication events captured for this team.</Muted>
                </CardHeader>
                <CardContent className="space-y-4">
                    {recentActivity.length > 0 ? (
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            {recentActivity.map((event) => (
                                <li key={event.id} className="rounded-lg border p-4">
                                    <p className="font-medium text-foreground">
                                        {formatAction(event.action)}
                                    </p>
                                    <p>
                                        {event.userName ?? "Unknown user"}
                                        {event.userEmail ? ` · ${event.userEmail}` : ""}
                                    </p>
                                    <p className="mt-1 text-xs">
                                        {formatRelativeDate(event.timestamp)}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <Muted>No activity recorded yet. Actions like sign-ins, invites, and profile changes will appear here.</Muted>
                    )}
                </CardContent>
            </Card>

            <section className="space-y-4 rounded-xl border bg-muted/30 p-6 text-sm text-muted-foreground">
                <h2 className="text-base font-medium text-foreground">
                    Need to switch plans?
                </h2>
                <p>
                    Visit the pricing page to explore other tiers. Changes take effect
                    immediately after checkout.
                </p>
                <Button asChild variant="outline">
                    <Link href="/pricing">View pricing</Link>
                </Button>
            </section>
        </main>
    );
}

function formatStatus(value: string) {
    const normalized = value.toLowerCase();
    if (normalized === "trialing") return "Trialing";
    if (normalized === "active") return "Active";
    if (normalized === "past_due") return "Past due";
    if (normalized === "canceled") return "Canceled";
    if (normalized === "unpaid") return "Unpaid";
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatDate(
    value: Date | string | null | undefined,
    options?: Intl.DateTimeFormatOptions,
) {
    if (!value) return "—";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString(undefined, options);
}

function formatRelativeDate(value: Date | string | null | undefined) {
    if (!value) return "—";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function formatRole(value: string | null | undefined) {
    if (!value) return "Member";
    return toTitleCase(value.replace(/-/g, " "));
}

function formatAction(value: string) {
    return toTitleCase(value.replace(/_/g, " "));
}

function toTitleCase(value: string) {
    return value
        .toLowerCase()
        .split(/\s+/)
        .map((segment) =>
            segment.length > 0
                ? segment.charAt(0).toUpperCase() + segment.slice(1)
                : segment,
        )
        .join(" ");
}
