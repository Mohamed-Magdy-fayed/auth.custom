import {
	getConfiguredOAuthProviders,
	providerDisplayNames,
} from "@/auth/core/oauth/providers";
import { SignInForm } from "@/auth/nextjs/components/SignInForm";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { getT } from "@/lib/i18n/actions";

export default async function SignIn({
	searchParams,
}: {
	searchParams: Promise<{
		oauthError?: string;
		redirect?: string;
		priceId?: string;
	}>;
}) {
	const { t } = await getT();
	const { oauthError, redirect: redirectTarget, priceId } = await searchParams;
	const providers = getConfiguredOAuthProviders().map((provider) => ({
		provider,
		label: providerDisplayNames[provider],
	}));

	return (
		<div className="container mx-auto p-4 max-w-[750px]">
			<Card>
				<CardHeader>
					<CardTitle>{t("authTranslations.signIn.title")}</CardTitle>
					<CardDescription>{t("authTranslations.signIn.description")}</CardDescription>
					{oauthError && (
						<CardDescription className="text-destructive">
							{oauthError}
						</CardDescription>
					)}
				</CardHeader>
				<CardContent>
					<SignInForm
						providers={providers}
						redirect={redirectTarget}
						priceId={priceId}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
