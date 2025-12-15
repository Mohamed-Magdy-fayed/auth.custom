"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function SubmitButton() {
	const { pending } = useFormStatus();
	const { t } = useTranslation();

	return (
		<Button
			type="submit"
			disabled={pending}
			variant="default"
			className="w-full rounded-full"
		>
			{pending ? (
				<>
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					{t("pricingPage.cards.cta.pending")}
				</>
			) : (
				<>
					{t("pricingPage.cards.cta.default")}
					<ArrowRight className="ml-2 h-4 w-4" />
				</>
			)}
		</Button>
	);
}
