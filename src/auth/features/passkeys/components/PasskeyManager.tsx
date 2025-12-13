"use client";

import { startRegistration } from "@simplewebauthn/browser";
import { useMemo, useState } from "react";

import { isFeatureEnabled } from "@/auth/config";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
	beginPasskeyRegistration,
	completePasskeyRegistration,
	deletePasskey,
	listPasskeys,
	type PasskeyListItem,
} from "../server/actions";

type Status = { type: "success" | "error"; message: string } | null;

export function PasskeyManager({
	initialPasskeys,
}: {
	initialPasskeys: PasskeyListItem[];
}) {
	const { t } = useTranslation();
	const tr = useMemo(
		() => (key: string, fallback: string, args?: Record<string, unknown>) => {
			const value = t(key as any, args as any);
			return value === key ? fallback : value;
		},
		[t],
	);
	const featureEnabled = useMemo(() => isFeatureEnabled("passkeys"), []);
	const [passkeys, setPasskeys] = useState(initialPasskeys);
	const [status, setStatus] = useState<Status>(null);
	const [isRegistering, setIsRegistering] = useState(false);
	const [busyId, setBusyId] = useState<string | null>(null);

	async function refreshPasskeys() {
		if (!featureEnabled) return;
		const updated = await listPasskeys();
		setPasskeys(updated);
	}

	async function handleRegister() {
		setStatus(null);

		if (!featureEnabled) {
			setStatus({
				type: "error",
				message: tr(
					"passkeys.featureDisabled",
					"Passkey authentication is disabled for this workspace.",
				),
			});
			return;
		}

		if (typeof window === "undefined" || !window.PublicKeyCredential) {
			setStatus({
				type: "error",
				message: tr(
					"passkeys.register.unsupported",
					"Passkeys are not supported in this browser.",
				),
			});
			return;
		}

		try {
			setIsRegistering(true);

			const optionsResult = await beginPasskeyRegistration();
			if (!optionsResult.success) {
				setStatus({ type: "error", message: optionsResult.message });
				return;
			}

			const attestation = await startRegistration({
				optionsJSON: optionsResult.options,
			});
			const completion = await completePasskeyRegistration(attestation);

			if (!completion.success) {
				setStatus({ type: "error", message: completion.message });
				return;
			}

			await refreshPasskeys();
			setStatus({ type: "success", message: completion.message });
		} catch (caught) {
			if (
				caught instanceof DOMException &&
				(caught.name === "AbortError" || caught.name === "NotAllowedError")
			) {
				setStatus({
					type: "error",
					message: tr(
						"passkeys.register.cancelled",
						"Passkey registration was cancelled.",
					),
				});
				return;
			}

			console.error("Passkey registration failed", caught);
			setStatus({
				type: "error",
				message: tr("passkeys.register.error", "Unable to add passkey."),
			});
		} finally {
			setIsRegistering(false);
		}
	}

	async function handleDelete(id: string) {
		setStatus(null);
		setBusyId(id);

		if (!featureEnabled) {
			setStatus({
				type: "error",
				message: tr(
					"passkeys.featureDisabled",
					"Passkey authentication is disabled for this workspace.",
				),
			});
			setBusyId(null);
			return;
		}

		try {
			const result = await deletePasskey(id);
			if (!result.success) {
				setStatus({ type: "error", message: result.message });
				return;
			}

			await refreshPasskeys();
			setStatus({ type: "success", message: result.message });
		} catch (caught) {
			console.error("Passkey removal failed", caught);
			setStatus({
				type: "error",
				message: tr("passkeys.delete.error", "Unable to remove passkey."),
			});
		} finally {
			setBusyId(null);
		}
	}

	if (!featureEnabled) {
		return (
			<div className="rounded border border-dashed px-3 py-4 text-sm text-muted-foreground">
				{tr(
					"passkeys.featureDisabled",
					"Passkey authentication is disabled for this workspace.",
				)}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{status && (
				<p
					className={
						status.type === "error"
							? "text-sm text-destructive"
							: "text-sm text-emerald-600"
					}
				>
					{status.message}
				</p>
			)}
			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-sm text-muted-foreground">
					{tr(
						"passkeys.settings.description",
						"Register a passkey to sign in without a password.",
					)}
				</p>
				<Button disabled={isRegistering} onClick={handleRegister}>
					{isRegistering
						? tr("passkeys.registering", "Waiting for passkey...")
						: tr("passkeys.add", "Add passkey")}
				</Button>
			</div>
			<ul className="space-y-3">
				{passkeys.length === 0 && (
					<li className="rounded border border-dashed px-3 py-4 text-sm text-muted-foreground">
						{tr("passkeys.list.empty", "No passkeys added yet.")}
					</li>
				)}
				{passkeys.map((item) => (
					<li
						key={item.id}
						className="flex flex-wrap items-center justify-between gap-3 rounded border px-3 py-2"
					>
						<div className="space-y-1">
							<p className="font-medium">
								{item.label ?? tr("passkeys.list.defaultLabel", "Passkey")}
							</p>
							<p className="text-xs text-muted-foreground">
								{tr("passkeys.list.created", "Created")}{" "}
								{new Date(item.createdAt).toLocaleString()}
							</p>
							{item.lastUsedAt && (
								<p className="text-xs text-muted-foreground">
									{tr("passkeys.list.lastUsed", "Last used")}{" "}
									{new Date(item.lastUsedAt).toLocaleString()}
								</p>
							)}
						</div>
						<Button
							variant="outline"
							disabled={busyId === item.id}
							onClick={() => handleDelete(item.id)}
						>
							{busyId === item.id
								? tr("passkeys.deleting", "Removing...")
								: tr("passkeys.delete", "Remove")}
						</Button>
					</li>
				))}
			</ul>
		</div>
	);
}
