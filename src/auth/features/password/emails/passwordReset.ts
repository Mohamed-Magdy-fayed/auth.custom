import { sendMail } from "@/lib/email/mailer";

export async function sendPasswordResetCodeEmail(options: {
    to: string;
    code: string;
    name?: string | null;
    expiresInMinutes: number;
}) {
    const subject = "Your password reset code";
    const greetingName = options.name?.trim() || "there";
    const expiresIn = Math.max(options.expiresInMinutes, 1);
    const text = `Hi ${greetingName},

We received a request to reset your password. Enter the verification code below in the reset form. The code expires in ${expiresIn} minute${expiresIn === 1 ? "" : "s"}.

${options.code}

If you did not request this change, you can safely ignore this email.`;
    const html = `
        <p>Hi ${escapeHtml(greetingName)},</p>
        <p>We received a request to reset your password. Use the verification code below in the reset form. The code expires in ${expiresIn} minute${expiresIn === 1 ? "" : "s"}.</p>
        <p style="text-align:center;margin:24px 0;">
            <span style="display:inline-block;padding:12px 24px;border-radius:6px;background:#111111;color:#ffffff;font-weight:600;font-size:20px;letter-spacing:6px;">${escapeHtml(
        options.code,
    )}</span>
        </p>
        <p>If you did not request this change, you can safely ignore this email.</p>
        <p>Thanks,<br/>The Gateling Team</p>
    `;

    await sendMail({
        toEmail: options.to,
        toName: options.name || "there",
        subject,
        text,
        html,
        fromName: "Gateling Auth",
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
            case "\"":
                return "&quot;";
            default:
                return char;
        }
    });
}
