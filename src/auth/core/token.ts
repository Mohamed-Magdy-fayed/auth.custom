import { createHash, randomBytes } from "crypto";

const RESET_TOKEN_BYTES = 32;

export function createTokenValue(byteLength: number = RESET_TOKEN_BYTES) {
	return randomBytes(byteLength).toString("hex");
}

export function hashTokenValue(token: string) {
	return createHash("sha256").update(token).digest("hex");
}
