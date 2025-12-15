import { sendMail } from "@/lib/email/mailer";
import { getT } from "@/lib/i18n/actions";

export async function sendPasswordResetCodeEmail(options: {
	to: string;
	code: string;
	name?: string | null;
	expiresInMinutes: number;
}) {
	const { t } = await getT();
	const subject = t("authTranslations.emails.passwordReset.subject");
	const defaultRecipientName = t("authTranslations.emails.common.defaultRecipientName");
	const greetingName = options.name?.trim() || defaultRecipientName;
	const expiresIn = Math.max(options.expiresInMinutes, 1);
	const expiresInValue = String(expiresIn);
	const minutesLabel =
		expiresIn === 1
			? t("authTranslations.emails.common.minuteSingular")
			: t("authTranslations.emails.common.minutePlural");
	const text = t("authTranslations.emails.passwordReset.text", {
		name: greetingName,
		expiresIn: expiresInValue,
		minutesLabel,
		code: options.code,
	});
	const greetingHtml = t("authTranslations.emails.common.greetingHtml", {
		name: escapeHtml(greetingName),
	});
	const introHtml = t("authTranslations.emails.passwordReset.html.intro", {
		expiresIn: expiresInValue,
		minutesLabel,
	});
	const ignoreNoticeHtml = t("authTranslations.emails.passwordReset.html.ignore");
	const signatureHtml = t("authTranslations.emails.common.signatureHtml");
	const html = `
		<p>${greetingHtml}</p>
		<p>${introHtml}</p>
		<p style="text-align:center;margin:24px 0;">
			<span style="display:inline-block;padding:12px 24px;border-radius:6px;background:#111111;color:#ffffff;font-weight:600;font-size:20px;letter-spacing:6px;">${escapeHtml(
		options.code,
	)}</span>
		</p>
		<p>${ignoreNoticeHtml}</p>
		<p>${signatureHtml}</p>
	`;
	const fromName = t("authTranslations.emails.common.fromName");

	await sendMail({
		toEmail: options.to,
		toName: options.name || defaultRecipientName,
		subject,
		text,
		html,
		fromName,
	});
}

function escapeHtml(value: string) {
	return value.replace(/[&<>"]+/g, (char) => {
		switch (char) {
			case "&":
				return "&amp;";
			case "<":
				return "&lt;";
			case ">":
				return "&gt;";
			case '"':
				return "&quot;";
			default:
				return char;
		}
	});
}
