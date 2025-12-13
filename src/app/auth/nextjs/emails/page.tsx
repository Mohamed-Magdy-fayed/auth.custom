import { BookMarked, MailPlus, RefreshCcw } from "lucide-react";

import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { H1, Muted, Small } from "@/components/ui/typography";

const EMAIL_PREVIEWS = [
	{
		id: "verify-email",
		icon: MailPlus,
		title: "Email verification",
		subject: "Verify your email address",
		description:
			"Sent after sign-up to confirm ownership and unlock the workspace. Links expire after 24 hours for safety.",
		html: `
			<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #111827;">
			  <p style="margin: 0 0 16px;">Hi there,</p>
			  <p style="margin: 0 0 16px;">Thanks for creating your workspace on Gateling Auth. Confirm your email address to finish onboarding.</p>
			  <div style="margin: 28px 0; text-align: center;">
			    <a href="#" style="display: inline-block; padding: 12px 24px; border-radius: 9999px; background: #111111; color: #ffffff; text-decoration: none; font-weight: 600;">Verify email address</a>
			  </div>
			  <p style="margin: 0 0 16px;">This link expires in <strong>24 hours</strong>. If you didn't request an account, you can safely ignore this message.</p>
			  <p style="margin: 0 0 4px;">— The Gateling Auth team</p>
			</div>
		`,
	},
	{
		id: "password-reset",
		icon: RefreshCcw,
		title: "Password reset",
		subject: "Reset your password",
		description:
			"Delivered when a user starts the recovery flow. Tokens are single-use and expire quickly to prevent abuse.",
		html: `
			<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #111827;">
			  <p style="margin: 0 0 16px;">Hi there,</p>
			  <p style="margin: 0 0 16px;">We received a request to reset the password for your Gateling Auth account. Click the button below to choose a new password.</p>
			  <div style="margin: 28px 0; text-align: center;">
			    <a href="#" style="display: inline-block; padding: 12px 24px; border-radius: 9999px; background: #f97316; color: #ffffff; text-decoration: none; font-weight: 600;">Reset password</a>
			  </div>
			  <p style="margin: 0 0 16px;">The link expires in <strong>30 minutes</strong>. If you didn't request this change, ignore this message and your password will stay the same.</p>
			  <p style="margin: 0 0 4px;">Need help? Reply to this email and we're happy to assist.</p>
			  <p style="margin: 0;">— The Gateling Auth team</p>
			</div>
		`,
	},
	{
		id: "email-change",
		icon: BookMarked,
		title: "Email change confirmation",
		subject: "Confirm your new email",
		description:
			"When a member updates their address we double-check ownership before swapping it on the profile.",
		html: `
			<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #111827;">
			  <p style="margin: 0 0 16px;">Hi there,</p>
			  <p style="margin: 0 0 16px;">We're confirming that you want to use this email address for your Gateling Auth account. Click below to finish the change.</p>
			  <div style="margin: 28px 0; text-align: center;">
			    <a href="#" style="display: inline-block; padding: 12px 24px; border-radius: 9999px; background: #111111; color: #ffffff; text-decoration: none; font-weight: 600;">Confirm email change</a>
			  </div>
			  <p style="margin: 0 0 16px;">If you didn't request this update, someone else might be attempting to change your address. Sign in and secure your account.</p>
			  <p style="margin: 0;">— The Gateling Auth team</p>
			</div>
		`,
	},
];

export default function EmailGalleryPage() {
	return (
		<MarketingLayout>
			<section className="bg-muted/30">
				<div className="container space-y-4 py-16 text-center">
					<Badge
						variant="outline"
						className="mx-auto inline-flex items-center gap-2 rounded-full px-4 py-1 uppercase tracking-wide"
					>
						Email previews
					</Badge>
					<H1 className="text-4xl sm:text-5xl">Preview transactional emails</H1>
					<Muted className="mx-auto max-w-3xl text-lg">
						Every authentication flow ships with copy and design ready to send. Share
						these previews with stakeholders or swap the content with your brand
						voice.
					</Muted>
				</div>
			</section>
			<section className="container space-y-10 py-16">
				<div className="grid gap-8 lg:grid-cols-2">
					{EMAIL_PREVIEWS.map((template) => (
						<Card key={template.id} className="flex h-full flex-col">
							<CardHeader className="space-y-3">
								<div className="flex items-center gap-3">
									<template.icon className="h-6 w-6 text-primary" />
									<div>
										<CardTitle className="text-xl">{template.title}</CardTitle>
										<Small className="text-muted-foreground">
											Subject: {template.subject}
										</Small>
									</div>
								</div>
								<Muted>{template.description}</Muted>
							</CardHeader>
							<CardContent className="flex-1 space-y-4">
								<div className="rounded-lg border bg-white shadow-sm">
									<div className="border-b bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
										Preview
									</div>
									<div
										className="p-6 text-sm leading-relaxed text-foreground"
										dangerouslySetInnerHTML={{ __html: template.html }}
									/>
								</div>
								<p className="text-xs text-muted-foreground">
									Adjust copy or styles in <code>src/auth/nextjs/emails</code> to plug in
									your brand.
								</p>
							</CardContent>
						</Card>
					))}
				</div>
			</section>
		</MarketingLayout>
	);
}
