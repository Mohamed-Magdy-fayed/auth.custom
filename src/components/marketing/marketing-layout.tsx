import type { ReactNode } from "react";

import { getCurrentUser } from "@/auth/nextjs/currentUser";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export async function MarketingLayout({ children }: { children: ReactNode }) {
    const currentUser = await getCurrentUser();

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <SiteHeader currentUser={currentUser} />
            <main className="flex-1">{children}</main>
            <SiteFooter />
        </div>
    );
}
