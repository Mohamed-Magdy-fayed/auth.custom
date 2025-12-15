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
	const { email, requested } = searchParams;

	return (
		<div className="container mx-auto max-w-[650px] p-4">
			<Card>
				<CardHeader>
					<CardTitle>{t("authTranslations.passwordReset.reset.title")}</CardTitle>
					<CardDescription>
						{t("authTranslations.passwordReset.reset.description")}
					</CardDescription>
					{requested && (
						<p className="text-sm text-emerald-600">
							{t("authTranslations.passwordReset.request.success")}
						</p>
					)}
				</CardHeader>
				<CardContent className="space-y-4">
					<ResetPasswordForm initialEmail={email ?? ""} />
					<p className="text-xs text-muted-foreground">
						{t("authTranslations.passwordReset.reset.didntReceive")} {" "}
						<Link
							className="text-xs font-medium text-primary"
							href="/forgot-password"
						>
							{t("authTranslations.passwordReset.reset.requestAnother")}
						</Link>
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
