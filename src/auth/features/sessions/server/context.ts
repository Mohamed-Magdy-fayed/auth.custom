import { headers } from "next/headers";
import { userAgentFromString } from "next/server";

export async function getSessionContext() {
    const headerStore = await headers();
    const userAgent = headerStore.get("user-agent") ?? undefined;
    const { device: { type } = { type: undefined } } = userAgent
        ? userAgentFromString(userAgent)
        : { device: { type: undefined } };
    const forwardedFor = headerStore.get("x-forwarded-for") ?? undefined;
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || undefined;

    return {
        userAgent,
        device: type === "mobile" ? "mobile" : "desktop",
        ipAddress,
    };
}
