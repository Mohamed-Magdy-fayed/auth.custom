"use client";

import type { PasskeyListItem } from "@/auth/features/passkeys/server/actions";
import { PasskeyManager } from "@/auth/nextjs/components/PasskeyManager";
import {
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export type PasskeysDialogProps = { passkeys: PasskeyListItem[] };

export function PasskeysDialog({ passkeys }: PasskeysDialogProps) {
    return (
        <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>Manage passkeys</DialogTitle>
                <DialogDescription>
                    Register or remove passkeys for passwordless sign-in.
                </DialogDescription>
            </DialogHeader>
            <PasskeyManager initialPasskeys={passkeys} />
        </DialogContent>
    );
}
