import { sendMail } from "@/lib/email/mailer";
import { getT } from "@/lib/i18n/actions";

export async function sendEmailChangeVerification(options: {
	to: string;
	name?: string | null;
	verificationUrl: string;
	currentEmail: string;
}) {
	const { t } = await getT();
	const defaultRecipientName = t("authTranslations.emails.common.defaultRecipientName");
	const displayName = options.name?.trim() || defaultRecipientName;
	const subject = t("authTranslations.emails.emailChangeVerification.subject");
	const text = t("authTranslations.emails.emailChangeVerification.text", {
		name: displayName,
		currentEmail: options.currentEmail,
		newEmail: options.to,
		verificationUrl: options.verificationUrl,
	});
	const greetingHtml = t("authTranslations.emails.common.greetingHtml", {
		name: escapeHtml(displayName),
	});
	const introHtml = t("authTranslations.emails.emailChangeVerification.html.intro", {
		currentEmail: escapeHtml(options.currentEmail),
		newEmail: escapeHtml(options.to),
	});
	const buttonLabel = t("authTranslations.emails.emailChangeVerification.ctaLabel");
	const ignoreNoticeHtml = t("authTranslations.emails.emailChangeVerification.html.ignore");
	const signatureHtml = t("authTranslations.emails.common.signatureHtml");
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
	const fromName = t("authTranslations.emails.common.fromName");

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
