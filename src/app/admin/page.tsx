import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/auth/nextjs/currentUser";
import { Button } from "@/components/ui/button";
import { Muted } from "@/components/ui/typography";
import { getT } from "@/lib/i18n/actions";

export default async function AdminPage() {
	const { t, locale } = await getT();
	const user = await getCurrentUser({ redirectIfNotFound: true });

	if (user.role !== "admin") {
		redirect("/app?notice=admin-only");
	}

	return (
		<div
			dir={locale === "ar" ? "rtl" : "ltr"}
			lang={locale}
			className="container mx-auto space-y-4 p-4"
		>
			<div className="space-y-2">
				<h1 className="text-4xl font-semibold tracking-tight">
					{t("adminPage.title")}
				</h1>
				<Muted>{t("adminPage.subtitle")}</Muted>
			</div>
			<Button asChild className="rounded-full">
				<Link href="/app">{t("adminPage.backCta")}</Link>
			</Button>
		</div>
	);
}
