import { sendMail } from "@/lib/email/mailer";
import { getT } from "@/lib/i18n/actions";

export async function sendEmailChangeVerification(options: {
	to: string;
	name?: string | null;
	verificationUrl: string;
	currentEmail: string;
}) {
	const { t } = await getT();
	const tr = (key: string, fallback: string, args?: Record<string, unknown>) => {
		const value = t(key as any, args as any);
		return value === key ? fallback : value;
	};
	const defaultRecipientName = tr(
		"emails.common.defaultRecipientName",
		"there",
	);
	const displayName = options.name?.trim() || defaultRecipientName;
	const subject = tr(
		"emails.emailChangeVerification.subject",
		"Confirm your new email address",
	);
	const text = tr(
		"emails.emailChangeVerification.text",
		"Hi {name},\n\nWe received a request to change the email on your Gateling account from {currentEmail} to {newEmail}. Confirm this change by visiting the link below:\n\n{verificationUrl}\n\nIf you didn't request this change, you can ignore this email and keep your current address.",
		{
			name: displayName,
			currentEmail: options.currentEmail,
			newEmail: options.to,
			verificationUrl: options.verificationUrl,
		},
	);
	const greetingHtml = tr("emails.common.greetingHtml", "Hi {name},", {
		name: escapeHtml(displayName),
	});
	const introHtml = tr(
		"emails.emailChangeVerification.html.intro",
		"We received a request to change the email on your Gateling account from <strong>{currentEmail}</strong> to <strong>{newEmail}</strong>.",
		{
			currentEmail: escapeHtml(options.currentEmail),
			newEmail: escapeHtml(options.to),
		},
	);
	const buttonLabel = tr(
		"emails.emailChangeVerification.ctaLabel",
		"Confirm email change",
	);
	const ignoreNoticeHtml = tr(
		"emails.emailChangeVerification.html.ignore",
		"If you didn't request this change, you can ignore this email and continue using your current address.",
	);
	const signatureHtml = tr(
		"emails.common.signatureHtml",
		"Thanks,<br/>The Gateling Team",
	);
	const html = `
		<p>${greetingHtml}</p>
		<p>${introHtml}</p>
		<p style="text-align:center;margin:24px 0;">
		  <a href="${options.verificationUrl}" style="display:inline-block;padding:12px 24px;border-radius:6px;background:#111111;color:#ffffff;text-decoration:none;font-weight:600;">
			${buttonLabel}
		  </a>
		</p>
		<p>${ignoreNoticeHtml}</p>
		<p>${signatureHtml}</p>
	`;
	const fromName = tr("emails.common.fromName", "Gateling Auth");

	await sendMail({
		toEmail: options.to,
		toName: displayName,
		subject,
		text,
		html,
		fromName,
	});
}

function escapeHtml(value: string) {
	return value.replace(/[&<>"']/g, (char) => {
		switch (char) {
			case "&":
				return "&amp;";
			case "<":
				return "&lt;";
			case ">":
				return "&gt;";
			case '"':
				return "&quot;";
			case "'":
				return "&#39;";
			default:
				return char;
		}
	});
}
