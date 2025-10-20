"use client";

import { ChangePasswordForm } from "@/auth/nextjs/components/ChangePasswordForm";
import {
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

export function PasswordDialog({ isCreate }: { isCreate?: boolean }) {
	return (
		<DialogContent className="max-w-xl">
			<DialogHeader>
				<DialogTitle>
					{isCreate ? "Create password" : "Change password"}
				</DialogTitle>
				<DialogDescription>
					Rotate your password regularly to keep the account secure.
				</DialogDescription>
			</DialogHeader>
			<ChangePasswordForm isCreate={isCreate} />
		</DialogContent>
	);
}
