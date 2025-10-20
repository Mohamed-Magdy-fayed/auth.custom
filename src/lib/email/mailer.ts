import nodemailer from "nodemailer";

import { env } from "@/data/env/server";

function getTransporter() {
	const transporter = nodemailer.createTransport({
		host: env.COMMS_EMAIL_HOST,
		port: env.COMMS_EMAIL_PORT,
		secure: env.COMMS_EMAIL_PORT === 465,
		auth: { user: env.COMMS_EMAIL, pass: env.COMMS_EMAIL_PASS },
	});

	return transporter;
}

export type SendMailOptions = {
	toName: string;
	toEmail: string;
	subject: string;
	text?: string;
	html: string;
	fromName?: string;
};

export async function sendMail({ fromName, ...options }: SendMailOptions) {
	const transport = getTransporter();

	await transport.sendMail({
		from: { name: fromName || env.COMMS_NAME, address: env.COMMS_EMAIL },
		to: { name: options.toName, address: options.toEmail },
		subject: options.subject,
		text: options.text,
		html: options.html,
	});
}
