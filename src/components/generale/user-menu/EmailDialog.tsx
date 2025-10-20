"use client";

import { ChangeEmailForm } from "@/auth/nextjs/components/ChangeEmailForm";
import { EmailVerificationNotice } from "@/auth/nextjs/components/EmailVerificationNotice";
import {
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

export type EmailDialogProps = { email: string; emailVerified: boolean };

export function EmailDialog({ email, emailVerified }: EmailDialogProps) {
	return (
		<DialogContent className="max-w-xl">
			<DialogHeader>
				<DialogTitle>Change email</DialogTitle>
				<DialogDescription>
					We&apos;ll send a confirmation link when you switch to a new address.
				</DialogDescription>
			</DialogHeader>
			<div className="space-y-4">
				{!emailVerified ? (
					<EmailVerificationNotice isVerified={emailVerified} />
				) : (
					<ChangeEmailForm currentEmail={email} />
				)}
			</div>
		</DialogContent>
	);
}
