"use client";

import { useCallback, useTransition } from "react";

import { authMessage } from "@/auth/config";
import { Button } from "@/components/ui/button";
import { revokeSession } from "../server/actions";

type RevokeSessionButtonProps = {
    sessionId: string;
    disabled?: boolean;
};

export function RevokeSessionButton({
    sessionId,
    disabled,
}: RevokeSessionButtonProps) {
    const [isPending, startTransition] = useTransition();

    const handleClick = useCallback(() => {
        startTransition(async () => {
            try {
                await revokeSession(sessionId);
            } catch (error) {
                console.error("Failed to revoke session", error);
            }
        });
    }, [sessionId]);

    return (
        <Button
            variant="destructive"
            size="sm"
            onClick={handleClick}
            disabled={disabled || isPending}
        >
            {isPending
                ? authMessage("session.action.revoking", "Revoking...")
                : authMessage("session.action.revoke", "Revoke")}
        </Button>
    );
}
