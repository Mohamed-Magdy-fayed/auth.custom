import Link from "next/link";
import { redirect } from "next/navigation";

import { OrganizationSwitcher } from "@/auth/features/org/components/OrganizationSwitcher";
import { listOrganizationsForUser } from "@/auth/features/org/server/actions";
import { getCurrentUser } from "@/auth/nextjs/currentUser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Muted, Small } from "@/components/ui/typography";
import { getT } from "@/lib/i18n/actions";
import {
	getOrganizationDashboardStats,
	getPendingInvitations,
	getRecentMembers,
	getRecentOrganizationActivity,
	getUserWithOrganization,
} from "@/saas/db/queries";
import { InviteMemberForm } from "./invite-member-form";

export default async function DashboardPage() {
	const { t, locale } = await getT();
	const dir = locale === "ar" ? "rtl" : "ltr";

	const user = await getCurrentUser({
		redirectIfNotFound: true,
		withFullUser: true,
	});
	const membership = await getUserWithOrganization(user.id);

	if (!membership?.organization) {
		redirect("/pricing");
	}

	const organization = membership.organization;

	const [stats, recentMembers, pendingInvites, recentActivity, organizations] =
		await Promise.all([
			getOrganizationDashboardStats(organization.id),
			getRecentMembers(organization.id),
			getPendingInvitations(organization.id),
			getRecentOrganizationActivity(organization.id),
			listOrganizationsForUser(user.id),
		]);

	const createdLabel = formatDate(
		organization.createdAt,
		{ year: "numeric", month: "short", day: "numeric" },
		locale,
	);

	const metricCards = [
		{
			label: t("dashboardPage.metrics.activeMembers"),
			value: stats.activeMembers.toString(),
		},
		{
			label: t("dashboardPage.metrics.pendingInvites"),
			value: stats.pendingInvites.toString(),
		},
		{
			label: t("dashboardPage.metrics.organizationCreated"),
			value: createdLabel,
		},
	];

	return (
		<main
			className="container mx-auto max-w-5xl space-y-8 py-12"
			dir={dir}
			lang={locale}
		>
			<header className="space-y-2">
				<h1 className="text-3xl font-semibold tracking-tight">
					{t("dashboardPage.title")}
				</h1>
				<Muted>{t("dashboardPage.subtitle")}</Muted>
			</header>

			<Card>
				<CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<CardTitle className="flex items-center gap-3 text-2xl">
							{organization.name}
							<Badge variant="secondary">
								{t("dashboardPage.organization.activeBadge")}
							</Badge>
						</CardTitle>
						<Muted>
							{t("dashboardPage.organization.slugLine", { slug: organization.slug })}
						</Muted>
					</div>
					<div className="flex flex-wrap gap-3">
						<Button asChild>
							<Link href="/pricing">{t("dashboardPage.organization.supportCta")}</Link>
						</Button>
						<Button asChild variant="outline">
							<Link href="/app/sessions">
								{t("dashboardPage.organization.sessionsCta")}
							</Link>
						</Button>
					</div>
				</CardHeader>
				<CardContent className="space-y-4 text-sm text-muted-foreground">
					<p>{t("dashboardPage.organization.description")}</p>
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

			{organizations.length > 1 ? (
				<Card>
					<CardHeader>
						<CardTitle className="text-xl">
							{t("dashboardPage.switcher.title")}
						</CardTitle>
						<Muted>{t("dashboardPage.switcher.subtitle")}</Muted>
					</CardHeader>
					<CardContent>
						<OrganizationSwitcher organizations={organizations} />
					</CardContent>
				</Card>
			) : null}

			<section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
				<Card>
					<CardHeader>
						<CardTitle className="text-xl">
							{t("dashboardPage.members.title")}
						</CardTitle>
						<Muted>{t("dashboardPage.members.subtitle")}</Muted>
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
												{member.name ?? t("dashboardPage.members.unknown")}
											</p>
											<Small className="block text-muted-foreground">
												{member.email ?? "—"}
											</Small>
										</div>
										<div className="text-right text-xs text-muted-foreground">
											<p>{t("dashboardPage.members.role")}</p>
											<p className="mt-1">
												{t("dashboardPage.members.joined", {
													date: formatRelativeDate(member.joinedAt ?? null, locale),
												})}
											</p>
										</div>
									</li>
								))}
							</ul>
						) : (
							<Muted>{t("dashboardPage.members.empty")}</Muted>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-xl">
							{t("dashboardPage.invites.title")}
						</CardTitle>
						<Muted>{t("dashboardPage.invites.subtitle")}</Muted>
					</CardHeader>
					<CardContent className="space-y-4">
						<InviteMemberForm organizationName={organization.name} />
						{pendingInvites.length > 0 ? (
							<ul className="space-y-3 text-sm text-muted-foreground">
								{pendingInvites.map((invite) => (
									<li
										key={`${invite.email}-${invite.invitedAt?.toString()}`}
										className="rounded-lg border bg-muted/40 p-3"
									>
										<p className="font-medium text-foreground">{invite.email}</p>
										<p>
											{t("dashboardPage.invites.invited", {
												date: formatRelativeDate(invite.invitedAt, locale),
											})}
										</p>
									</li>
								))}
							</ul>
						) : (
							<Muted>{t("dashboardPage.invites.empty")}</Muted>
						)}
					</CardContent>
				</Card>
			</section>

			<Card>
				<CardHeader>
					<CardTitle className="text-xl">
						{t("dashboardPage.activity.title")}
					</CardTitle>
					<Muted>{t("dashboardPage.activity.subtitle")}</Muted>
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
										{event.userName ?? t("dashboardPage.activity.unknown")}
										{event.userEmail ? ` · ${event.userEmail}` : ""}
									</p>
									<p className="mt-1 text-xs">
										{formatRelativeDate(event.timestamp, locale)}
									</p>
								</li>
							))}
						</ul>
					) : (
						<Muted>{t("dashboardPage.activity.empty")}</Muted>
					)}
				</CardContent>
			</Card>

			<section className="space-y-4 rounded-xl border bg-muted/30 p-6 text-sm text-muted-foreground">
				<h2 className="text-base font-medium text-foreground">
					{t("dashboardPage.plan.title")}
				</h2>
				<p>{t("dashboardPage.plan.subtitle")}</p>
				<Button asChild variant="outline">
					<Link href="/pricing">{t("dashboardPage.plan.cta")}</Link>
				</Button>
			</section>
		</main>
	);
}

function formatDate(
	value: Date | string | null | undefined,
	options?: Intl.DateTimeFormatOptions,
	locale?: string,
) {
	if (!value) return "—";
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "—";
	return date.toLocaleString(locale, options);
}

function formatRelativeDate(
	value: Date | string | null | undefined,
	locale?: string,
) {
	if (!value) return "—";
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "—";
	return date.toLocaleString(locale, {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
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
