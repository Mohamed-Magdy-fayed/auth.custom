import { sendMail } from "@/lib/email/mailer";

export async function sendEmailVerificationEmail(options: {
	to: string;
	name?: string | null;
	verificationUrl: string;
}) {
	const subject = "Verify your email address";
	const displayName = options.name?.trim() || "there";
	const text = `Hi ${displayName},\n\nConfirm your email address by visiting the link below. The link expires in 24 hours.\n\n${options.verificationUrl}\n\nIf you did not create an account or request verification, you can ignore this message.`;
	const html = `
    <p>Hi ${escapeHtml(displayName)},</p>
    <p>Confirm your email address by clicking the button below. The link expires in 24 hours.</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${options.verificationUrl}" style="display:inline-block;padding:12px 24px;border-radius:6px;background:#111111;color:#ffffff;text-decoration:none;font-weight:600;">
        Verify email address
      </a>
    </p>
    <p>If you did not create an account or request verification, you can ignore this message.</p>
    <p>Thanks,<br/>The Gateling Team</p>
  `;

	await sendMail({
		toEmail: options.to,
		toName: displayName,
		subject,
		text,
		html,
		fromName: "Gateling Auth",
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
