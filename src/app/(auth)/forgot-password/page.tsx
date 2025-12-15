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

	return (
		<div className="container mx-auto p-4 max-w-[650px]">
			<Card>
				<CardHeader>
					<CardTitle>{t("authTranslations.passwordReset.forgot.title")}</CardTitle>
					<CardDescription>
						{t("authTranslations.passwordReset.forgot.description")}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ForgotPasswordForm />
				</CardContent>
			</Card>
		</div>
	);
}
