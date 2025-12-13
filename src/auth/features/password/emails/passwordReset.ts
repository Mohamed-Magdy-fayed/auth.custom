import { sendMail } from "@/lib/email/mailer";
import { getT } from "@/lib/i18n/actions";

type Translator = (key: string, fallback: string, args?: Record<string, unknown>) => string;

async function getTranslator(): Promise<Translator> {
	const { t } = await getT();
	return (key, fallback, args) => {
		const value = t(key as any, args as any);
		return value === key ? fallback : value;
	};
}

export async function sendPasswordResetCodeEmail(options: {
	to: string;
	code: string;
	name?: string | null;
	expiresInMinutes: number;
}) {
	const tr = await getTranslator();
	const subject = tr("emails.passwordReset.subject", "Your password reset code");
	const defaultRecipientName = tr("emails.common.defaultRecipientName", "there");
	const greetingName = options.name?.trim() || defaultRecipientName;
	const expiresIn = Math.max(options.expiresInMinutes, 1);
	const expiresInValue = String(expiresIn);
	const minutesLabel =
		expiresIn === 1
			? tr("emails.common.minuteSingular", "minute")
			: tr("emails.common.minutePlural", "minutes");
	const text = tr(
		"emails.passwordReset.text",
		"Hi {name},\n\nWe received a request to reset your password. Enter the verification code below in the reset form. The code expires in {expiresIn} {minutesLabel}.\n\n{code}\n\nIf you did not request this change, you can safely ignore this email.",
		{
			name: greetingName,
			expiresIn: expiresInValue,
			minutesLabel,
			code: options.code,
		},
	);
	const greetingHtml = tr("emails.common.greetingHtml", "Hi {name},", {
		name: escapeHtml(greetingName),
	});
	const introHtml = tr(
		"emails.passwordReset.html.intro",
		"We received a request to reset your password. Use the verification code below in the reset form. The code expires in {expiresIn} {minutesLabel}.",
		{ expiresIn: expiresInValue, minutesLabel },
	);
	const ignoreNoticeHtml = tr(
		"emails.passwordReset.html.ignore",
		"If you did not request this change, you can safely ignore this email.",
	);
	const signatureHtml = tr(
		"emails.common.signatureHtml",
		"Thanks,<br/>The Gateling Team",
	);
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
	const fromName = tr("emails.common.fromName", "Gateling Auth");

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
