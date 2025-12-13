import { sendMail } from "@/lib/email/mailer";
import { getT } from "@/lib/i18n/actions";

export async function sendEmailVerificationEmail(options: {
	to: string;
	name?: string | null;
	verificationUrl: string;
}) {
	const { t } = await getT();
	const tr = (key: string, fallback: string, args?: Record<string, unknown>) => {
		const value = t(key as any, args as any);
		return value === key ? fallback : value;
	};
	const expiryHours = "24";
	const defaultRecipientName = tr(
		"emails.common.defaultRecipientName",
		"there",
	);
	const displayName = options.name?.trim() || defaultRecipientName;
	const subject = tr(
		"emails.emailVerification.subject",
		"Verify your email address",
	);
	const text = tr(
		"emails.emailVerification.text",
		"Hi {name},\n\nConfirm your email address by visiting the link below. The link expires in {expiryHours} hours.\n\n{verificationUrl}\n\nIf you did not create an account or request verification, you can ignore this message.",
		{ name: displayName, expiryHours, verificationUrl: options.verificationUrl },
	);
	const greetingHtml = tr("emails.common.greetingHtml", "Hi {name},", {
		name: escapeHtml(displayName),
	});
	const introHtml = tr(
		"emails.emailVerification.html.intro",
		"Confirm your email address by clicking the button below. The link expires in {expiryHours} hours.",
		{ expiryHours },
	);
	const buttonLabel = tr(
		"emails.emailVerification.ctaLabel",
		"Verify email address",
	);
	const ignoreNoticeHtml = tr(
		"emails.emailVerification.html.ignore",
		"If you did not create an account or request verification, you can ignore this message.",
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
