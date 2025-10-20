import Link from "next/link";

const FOOTER_LINKS = [
    { href: "/pricing", label: "Pricing" },
    { href: "/features", label: "Features" },
    { href: "/docs", label: "Documentation" },
    { href: "https://github.com/", label: "GitHub" },
];

export function SiteFooter() {
    return (
        <footer className="border-t bg-muted/40">
            <div className="container flex flex-col gap-6 py-10 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="font-semibold text-foreground">auth.custom</p>
                    <p>Production-ready authentication starter for modern SaaS teams.</p>
                </div>
                <nav className="flex flex-wrap gap-4">
                    {FOOTER_LINKS.map((item) => (
                        <Link key={item.href} href={item.href} className="transition hover:text-foreground">
                            {item.label}
                        </Link>
                    ))}
                </nav>
            </div>
        </footer>
    );
}
