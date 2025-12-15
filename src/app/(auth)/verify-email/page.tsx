import Link from "next/link";
import { verifyEmailChange } from "@/auth/nextjs/emailActions";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { getT } from "@/lib/i18n/actions";

export default async function VerifyEmailPage({
	searchParams,
}: {
	searchParams: Promise<{ token?: string }>;
}) {
	const { t } = await getT();
	const { token } = await searchParams;
	const result = token
		? await verifyEmailChange(token)
		: {
			status: "error" as const,
			message: t("authTranslations.emailVerification.error.invalidToken"),
		};

	return (
		<div className="container mx-auto p-4 max-w-[650px]">
			<Card>
				<CardHeader>
					<CardTitle>{t("authTranslations.emailVerification.heading")}</CardTitle>
					<CardDescription>
						{result.status === "success"
							? t("authTranslations.emailVerification.description.success")
							: t("authTranslations.emailVerification.description.error")}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<p
						className={
							result.status === "success"
								? "text-sm text-emerald-600"
								: "text-sm text-destructive"
						}
						role={result.status === "success" ? "status" : "alert"}
						aria-live={result.status === "success" ? "polite" : "assertive"}
					>
						{result.message}
					</p>
					<div className="flex gap-3">
						<Button asChild variant="outline">
							<Link href="/">{t("authTranslations.emailVerification.backHome")}</Link>
						</Button>
						<Button asChild>
							<Link href="/sign-in">{t("authTranslations.emailVerification.backToSignIn")}</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
