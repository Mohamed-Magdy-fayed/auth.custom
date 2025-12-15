import {
	getConfiguredOAuthProviders,
	providerDisplayNames,
} from "@/auth/core/oauth/providers";
import { SignUpForm } from "@/auth/nextjs/components/SignUpForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getT } from "@/lib/i18n/actions";

export default async function SignUp({
	searchParams,
}: {
	searchParams: Promise<{
		redirect?: string;
		priceId?: string;
		inviteToken?: string;
	}>;
}) {
	const { t } = await getT();
	const { redirect, priceId, inviteToken } = await searchParams;
	const providers = getConfiguredOAuthProviders().map((provider) => ({
		provider,
		label: providerDisplayNames[provider],
	}));

	return (
		<div className="container mx-auto p-4 max-w-[750px]">
			<Card>
				<CardHeader>
					<CardTitle>{t("authTranslations.signUp.submit")}</CardTitle>
				</CardHeader>
				<CardContent>
					<SignUpForm
						providers={providers}
						redirect={redirect}
						priceId={priceId}
						inviteToken={inviteToken}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
