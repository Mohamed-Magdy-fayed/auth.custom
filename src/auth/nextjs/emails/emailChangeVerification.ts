import { sendMail } from "@/lib/email/mailer"

export async function sendEmailChangeVerification(options: {
    to: string
    name?: string | null
    verificationUrl: string
    currentEmail: string
}) {
    const subject = "Confirm your new email address"
    const displayName = options.name?.trim() || "there"
    const text = `Hi ${displayName},\n\nWe received a request to change the email on your Gateling account from ${options.currentEmail} to ${options.to}. Confirm this change by visiting the link below:\n\n${options.verificationUrl}\n\nIf you didn't request this change, you can ignore this email and keep your current address.`
    const html = `
    <p>Hi ${escapeHtml(displayName)},</p>
    <p>We received a request to change the email on your Gateling account from <strong>${escapeHtml(
        options.currentEmail
    )}</strong> to <strong>${escapeHtml(options.to)}</strong>.</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${options.verificationUrl}" style="display:inline-block;padding:12px 24px;border-radius:6px;background:#111111;color:#ffffff;text-decoration:none;font-weight:600;">
        Confirm email change
      </a>
    </p>
    <p>If you didn't request this change, you can ignore this email and continue using your current address.</p>
    <p>Thanks,<br/>The Gateling Team</p>
  `

    await sendMail({
        toEmail: options.to,
        toName: displayName,
        subject,
        text,
        html,
        fromName: "Gateling Auth",
    })
}

function escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, char => {
        switch (char) {
            case "&":
                return "&amp;"
            case "<":
                return "&lt;"
            case ">":
                return "&gt;"
            case '"':
                return "&quot;"
            case "'":
                return "&#39;"
            default:
                return char
        }
    })
}
