import { ForgotPasswordForm } from "@/auth/nextjs/components/ForgotPasswordForm";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { getT } from "@/lib/i18n/actions";

export default async function ForgotPasswordPage() {
	const { t } = await getT();
	const tr = (
		key: string,
		fallback: string,
		args?: Record<string, unknown>,
	) => {
		const value = t(key as any, args as any);
		return value === key ? fallback : value;
	};

	return (
		<div className="container mx-auto p-4 max-w-[650px]">
			<Card>
				<CardHeader>
					<CardTitle>
						{tr("passwordReset.forgot.title", "Forgot password")}
					</CardTitle>
					<CardDescription>
						{tr(
							"passwordReset.forgot.description",
							"Enter the email on your account and we will send a 6-digit reset code.",
						)}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ForgotPasswordForm />
				</CardContent>
			</Card>
		</div>
	);
}
