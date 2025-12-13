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
	const tr = (
		key: string,
		fallback: string,
		args?: Record<string, unknown>,
	) => {
		const value = t(key as any, args as any);
		return value === key ? fallback : value;
	};
	const { token } = await searchParams;
	const result = token
		? await verifyEmailChange(token)
		: {
			status: "error" as const,
			message: tr(
				"emailVerification.error.invalidToken",
				"Invalid email verification link.",
			),
		};

	return (
		<div className="container mx-auto p-4 max-w-[650px]">
			<Card>
				<CardHeader>
					<CardTitle>
						{tr("emailVerification.heading", "Email verification")}
					</CardTitle>
					<CardDescription>
						{result.status === "success"
							? tr(
								"emailVerification.description.success",
								"Your email address is now verified.",
							)
							: tr(
								"emailVerification.description.error",
								"We could not verify your email address.",
							)}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<p
						className={
							result.status === "success"
								? "text-sm text-emerald-600"
								: "text-sm text-destructive"
						}
					>
						{result.message}
					</p>
					<div className="flex gap-3">
						<Button asChild variant="outline">
							<Link href="/">{tr("emailVerification.backHome", "Home")}</Link>
						</Button>
						<Button asChild>
							<Link href="/sign-in">
								{tr("emailVerification.backToSignIn", "Sign in")}
							</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
