"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocaleCookie } from "@/lib/i18n/actions";
import { LOCALE_COOKIE_NAME } from "@/lib/i18n/lib";
import { Button } from "@/components/ui/button";

function readLocaleFromCookie() {
    if (typeof document === "undefined") return "en";
    const match = document.cookie.match(
        new RegExp(`${LOCALE_COOKIE_NAME}=([^;]+)`, "i"),
    );
    return match?.[1] ?? "en";
}

export function LocaleToggle() {
    const router = useRouter();
    const [locale, setLocale] = useState<"en" | "ar">("en");
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        setLocale((readLocaleFromCookie() as "en" | "ar") ?? "en");
    }, []);

    const nextLocale = useMemo(() => (locale === "en" ? "ar" : "en"), [locale]);

    const handleToggle = () => {
        const target = nextLocale;
        setLocale(target);
        document.documentElement.setAttribute("dir", target === "ar" ? "rtl" : "ltr");
        startTransition(async () => {
            await setLocaleCookie(target);
            router.refresh();
        });
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleToggle}
            disabled={isPending}
            className="rounded-full"
        >
            {locale === "en" ? "عربي" : "EN"}
        </Button>
    );
}
