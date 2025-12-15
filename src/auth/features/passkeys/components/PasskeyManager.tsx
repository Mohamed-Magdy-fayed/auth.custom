"use client";

import { startRegistration } from "@simplewebauthn/browser";
import { useMemo, useState } from "react";

import { isFeatureEnabled } from "@/auth/config/features";
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
				message: t("authTranslations.passkeys.featureDisabled"),
			});
			return;
		}

		if (typeof window === "undefined" || !window.PublicKeyCredential) {
			setStatus({
				type: "error",
				message: t("authTranslations.passkeys.register.unsupported"),
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
					message: t("authTranslations.passkeys.register.cancelled"),
				});
				return;
			}

			console.error("Passkey registration failed", caught);
			setStatus({
				type: "error",
				message: t("authTranslations.passkeys.register.error"),
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
				message: t("authTranslations.passkeys.featureDisabled"),
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
				message: t("authTranslations.passkeys.delete.error"),
			});
		} finally {
			setBusyId(null);
		}
	}

	if (!featureEnabled) {
		return (
			<div className="rounded border border-dashed px-3 py-4 text-sm text-muted-foreground">
				{t("authTranslations.passkeys.featureDisabled")}
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
					{t("authTranslations.passkeys.settings.description")}
				</p>
				<Button disabled={isRegistering} onClick={handleRegister}>
					{isRegistering ? t("authTranslations.passkeys.registering") : t("authTranslations.passkeys.add")}
				</Button>
			</div>
			<ul className="space-y-3">
				{passkeys.length === 0 && (
					<li className="rounded border border-dashed px-3 py-4 text-sm text-muted-foreground">
						{t("authTranslations.passkeys.list.empty")}
					</li>
				)}
				{passkeys.map((item) => (
					<li
						key={item.id}
						className="flex flex-wrap items-center justify-between gap-3 rounded border px-3 py-2"
					>
						<div className="space-y-1">
							<p className="font-medium">
								{item.label ?? t("authTranslations.passkeys.list.defaultLabel")}
							</p>
							<p className="text-xs text-muted-foreground">
								{t("authTranslations.passkeys.list.created")} {" "}
								{new Date(item.createdAt).toLocaleString()}
							</p>
							{item.lastUsedAt && (
								<p className="text-xs text-muted-foreground">
									{t("authTranslations.passkeys.list.lastUsed")} {" "}
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
								? t("authTranslations.passkeys.deleting")
								: t("authTranslations.passkeys.delete.label")}
						</Button>
					</li>
				))}
			</ul>
		</div>
	);
}
