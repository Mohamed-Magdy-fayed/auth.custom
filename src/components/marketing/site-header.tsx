import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getT } from "@/lib/i18n/actions";
import { LocaleToggle } from "./locale-toggle";

const NAV_LINKS = [
	{ href: "/features", labelKey: "marketing.header.nav.features" },
	{ href: "/pricing", labelKey: "marketing.header.nav.pricing" },
	{ href: "/docs", labelKey: "marketing.header.nav.docs" },
];

type SiteHeaderProps = {
	className?: string;
	currentUser?: { id: string; role?: string | null } | null;
};

export async function SiteHeader({ className, currentUser }: SiteHeaderProps) {
	const { t, locale } = await getT();
	const dir = locale === "ar" ? "rtl" : "ltr";
	const toKey = (key: string) => key as Parameters<typeof t>[0];

	return (
		<header
			dir={dir}
			lang={locale}
			className={cn(
				"sticky top-0 z-50 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80",
				className,
			)}
		>
			<div className="container flex h-16 items-center justify-between gap-6">
				<Link href="/" className="flex items-center gap-2 text-sm font-semibold">
					<span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
						ac
					</span>
					<span className="hidden sm:inline-block">{t("marketing.brand")}</span>
				</Link>
				<nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
					{NAV_LINKS.map((item) => (
						<Link
							key={item.href}
							href={item.href}
							className="transition hover:text-foreground"
						>
							{t(toKey(item.labelKey))}
						</Link>
					))}
				</nav>
				<div className="flex items-center gap-3">
					{currentUser ? (
						<>
							<LocaleToggle />
							<Button
								asChild
								variant="ghost"
								size="sm"
								className="hidden sm:inline-flex"
							>
								<Link href="/app">{t("marketing.header.openWorkspace")}</Link>
							</Button>
							<Button asChild size="sm" className="rounded-full">
								<Link href="/dashboard">{t("marketing.header.goToDashboard")}</Link>
							</Button>
						</>
					) : (
						<>
							<LocaleToggle />
							<Button
								asChild
								variant="ghost"
								size="sm"
								className="hidden sm:inline-flex"
							>
								<Link href="/sign-in">{t("marketing.header.signIn")}</Link>
							</Button>
							<Button asChild size="sm" className="rounded-full">
								<Link href="/sign-up">{t("marketing.header.getStarted")}</Link>
							</Button>
						</>
					)}
				</div>
			</div>
		</header>
	);
}
