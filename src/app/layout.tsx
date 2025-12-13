import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { getLocaleCookie } from "@/lib/i18n/actions";
import { TranslationProvider } from "@/lib/i18n/useTranslation";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Gateling Auth — Production-ready authentication starter",
	description:
		"Launch a polished SaaS authentication experience with multi-tenant orgs, billing, and docs out of the box.",
};

export default async function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const locale = await getLocaleCookie();
	const dir = locale === "ar" ? "rtl" : "ltr";

	return (
		<html lang={locale} dir={dir}>
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<TranslationProvider defaultLocale={locale} fallbackLocale="en">
					{children}
				</TranslationProvider>
			</body>
		</html>
	);
}
