import Link from "next/link";
import { authMessage } from "@/auth/config";
import { ResetPasswordForm } from "@/auth/nextjs/components/ResetPasswordForm";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default async function ResetPasswordPage({
	searchParams,
}: {
	searchParams: Promise<{ email?: string }>;
}) {
	const { email } = await searchParams;

	return (
		<div className="container mx-auto max-w-[650px] p-4">
			<Card>
				<CardHeader>
					<CardTitle>
						{authMessage("passwordReset.reset.title", "Choose a new password")}
					</CardTitle>
					<CardDescription>
						{authMessage(
							"passwordReset.reset.description",
							"Enter the verification code from your email and set a new password.",
						)}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<ResetPasswordForm initialEmail={email ?? ""} />
					<p className="text-xs text-muted-foreground">
						{authMessage("passwordReset.reset.didntReceive", "Didn't get a code?")}{" "}
						<Link
							className="text-xs font-medium text-primary"
							href="/forgot-password"
						>
							{authMessage(
								"passwordReset.reset.requestAnother",
								"Request another reset code.",
							)}
						</Link>
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
