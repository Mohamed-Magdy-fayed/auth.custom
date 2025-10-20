"use client";

import { Loader2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type ButtonVariant = ComponentProps<typeof Button>["variant"];

export function ManageSubscriptionButton({
    children = "Manage subscription",
    variant = "outline",
}: {
    children?: ReactNode;
    variant?: ButtonVariant;
}) {
    const { pending } = useFormStatus();

    return (
        <Button type="submit" variant={variant} disabled={pending}>
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening portal...
                </>
            ) : (
                children
            )}
        </Button>
    );
}
