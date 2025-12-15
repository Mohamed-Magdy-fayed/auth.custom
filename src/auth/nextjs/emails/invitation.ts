import { sendMail } from "@/lib/email/mailer";
import { getT } from "@/lib/i18n/actions";

function escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (char) => {
        switch (char) {
            case "&":
                return "&amp;";
            case "<":
                return "&lt;";
            case ">":
                return "&gt;";
            case "\"":
                return "&quot;";
            case "'":
                return "&#39;";
            default:
                return char;
        }
    });
}

type InvitationEmailOptions = {
    to: string;
    organizationName?: string | null;
    inviteUrl: string;
    inviterName?: string | null;
};

export async function sendInvitationEmail(options: InvitationEmailOptions) {
    const { t } = await getT();
    const fallbackOrganization = t("authTranslations.emails.invitation.organizationFallback");
    const organizationName =
        options.organizationName?.trim() && options.organizationName.trim().length > 0
            ? options.organizationName.trim()
            : fallbackOrganization;
    const inviterName = options.inviterName?.trim();
    const defaultRecipientName = t("authTranslations.emails.common.defaultRecipientName");
    const displayName = defaultRecipientName;
    const subject = t("authTranslations.emails.invitation.subject", { organization: organizationName });
    const text = t("authTranslations.emails.invitation.text", {
        organization: organizationName,
        inviteUrl: options.inviteUrl,
        inviter: inviterName ?? t("authTranslations.emails.invitation.inviterFallback"),
    });
    const greetingHtml = t("authTranslations.emails.common.greetingHtml", {
        name: escapeHtml(displayName),
    });
    const introHtml = t("authTranslations.emails.invitation.html.intro", {
        organization: escapeHtml(organizationName),
    });
    const invitedByHtml = inviterName
        ? `<p>${t("authTranslations.emails.invitation.html.invitedBy", { inviter: escapeHtml(inviterName) })}</p>`
        : "";
    const buttonLabel = t("authTranslations.emails.invitation.ctaLabel");
    const ignoreNoticeHtml = t("authTranslations.emails.invitation.html.ignore");
    const signatureHtml = t("authTranslations.emails.common.signatureHtml");
    const html = `
		<p>${greetingHtml}</p>
		<p>${introHtml}</p>
		${invitedByHtml}
		<p style="text-align:center;margin:24px 0;">
		  <a href="${options.inviteUrl}" style="display:inline-block;padding:12px 24px;border-radius:6px;background:#111111;color:#ffffff;text-decoration:none;font-weight:600;">
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
