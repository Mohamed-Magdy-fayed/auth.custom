import Link from "next/link";
import { ResetPasswordForm } from "@/auth/nextjs/components/ResetPasswordForm";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { getT } from "@/lib/i18n/actions";

export default async function ResetPasswordPage({
	searchParams,
}: {
	searchParams: { email?: string; requested?: string };
}) {
	const { t } = await getT();
	const tr = (
		key: string,
		fallback: string,
		args?: Record<string, unknown>,
	) => {
		const value = t(key as any, args as any);
		return value === key ? fallback : value;
	};
	const { email, requested } = searchParams;

	return (
		<div className="container mx-auto max-w-[650px] p-4">
			<Card>
				<CardHeader>
					<CardTitle>
						{tr("passwordReset.reset.title", "Choose a new password")}
					</CardTitle>
					<CardDescription>
						{tr(
							"passwordReset.reset.description",
							"Enter the verification code from your email and set a new password.",
						)}
					</CardDescription>
					{requested && (
						<p className="text-sm text-emerald-600">
							{tr(
								"passwordReset.request.success",
								"If that email exists, we just sent a reset code.",
							)}
						</p>
					)}
				</CardHeader>
				<CardContent className="space-y-4">
					<ResetPasswordForm initialEmail={email ?? ""} />
					<p className="text-xs text-muted-foreground">
						{tr("passwordReset.reset.didntReceive", "Didn't get a code?")} {" "}
						<Link
							className="text-xs font-medium text-primary"
							href="/forgot-password"
						>
							{tr(
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
