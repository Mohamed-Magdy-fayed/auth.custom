import Link from "next/link";

import { getT } from "@/lib/i18n/actions";

const FOOTER_LINKS = [
	{ href: "/pricing", labelKey: "marketing.footer.links.pricing" },
	{ href: "/features", labelKey: "marketing.footer.links.features" },
	{ href: "/docs", labelKey: "marketing.footer.links.docs" },
	{ href: "https://github.com/", labelKey: "marketing.footer.links.github" },
];

export async function SiteFooter() {
	const { t, locale } = await getT();
	const dir = locale === "ar" ? "rtl" : "ltr";
	const toKey = (key: string) => key as Parameters<typeof t>[0];

	return (
		<footer className="border-t bg-muted/40" dir={dir} lang={locale}>
			<div className="container flex flex-col gap-6 py-10 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
				<div>
					<p className="font-semibold text-foreground">{t("marketing.brand")}</p>
					<p>{t("marketing.footer.tagline")}</p>
				</div>
				<nav className="flex flex-wrap gap-4">
					{FOOTER_LINKS.map((item) => (
						<Link
							key={item.href}
							href={item.href}
							className="transition hover:text-foreground"
						>
							{t(toKey(item.labelKey))}
						</Link>
					))}
				</nav>
			</div>
		</footer>
	);
}
