import { toast } from "sonner";
import type { signIn } from "@/auth/nextjs/actions";
import type { mainTranslations } from "@/lib/i18n/global";
import type { TFunction } from "@/lib/i18n/lib";

export function showAuthToast(
    error: Awaited<ReturnType<typeof signIn>>,
    t: TFunction<typeof mainTranslations>,
) {
    switch (error) {
        case "Bad request":
            toast.error(t("authTranslations.error.badRequest"));
            break;
        case "No user":
            toast.error(t("authTranslations.error.noUser"));
            break;
        case "No password":
            toast.error(t("authTranslations.error.noPassword"));
            break;
        case "Credentials":
            toast.error(t("authTranslations.error.credentials"));
            break;
        default:
            toast.success(t("authTranslations.signIn.success"));
            return;
    }
}
