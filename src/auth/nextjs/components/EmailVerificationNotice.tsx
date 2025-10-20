"use client";

import { useState, useTransition } from "react";

import { authMessage } from "@/auth/config";
import { Button } from "@/components/ui/button";

import { sendEmailVerification } from "../emailActions";

type EmailVerificationNoticeProps = { isVerified: boolean };

type NoticeStatus = { success: boolean; message: string };

export function EmailVerificationNotice({
	isVerified,
}: EmailVerificationNoticeProps) {
	const [status, setStatus] = useState<NoticeStatus | null>(null);
	const [isPending, startTransition] = useTransition();

	if (isVerified) {
		return (
			<p className="text-sm text-muted-foreground">
				{authMessage(
					"emailVerification.alreadyVerifiedNote",
					"Your email address is verified.",
				)}
			</p>
		);
	}

	return (
		<div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
			<p className="font-medium">
				{authMessage("emailVerification.notice.title", "Verify your email")}
			</p>
			<p className="mt-1">
				{authMessage(
					"emailVerification.notice.description",
					"We use this address for password recovery and security alerts.",
				)}
			</p>
			{status && (
				<p
					className={`mt-2 ${status.success ? "text-emerald-700 dark:text-emerald-400" : "text-destructive dark:text-red-400"}`}
				>
					{status.message}
				</p>
			)}
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="mt-3"
				disabled={isPending}
				onClick={() => {
					startTransition(async () => {
						setStatus(null);
						const result = await sendEmailVerification();
						setStatus({ success: result.success, message: result.message });
					});
				}}
			>
				{isPending
					? authMessage("emailVerification.notice.sending", "Sending...")
					: authMessage(
							"emailVerification.notice.sendButton",
							"Send verification email",
						)}
			</Button>
		</div>
	);
}
