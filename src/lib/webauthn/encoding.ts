import { Buffer } from "buffer";

const base64UrlRegex = /-/g;
const underscoreRegex = /_/g;

function normalizeBase64(base64Url: string) {
	const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
	return (base64Url + padding)
		.replace(base64UrlRegex, "+")
		.replace(underscoreRegex, "/");
}

export function base64UrlToBuffer(value: string): Uint8Array {
	const cleaned = normalizeBase64(value);
	const buffer = Buffer.from(cleaned, "base64");
	return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

export function bufferToBase64Url(value: Uint8Array): string {
	const base64 = Buffer.from(value).toString("base64");
	return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}
