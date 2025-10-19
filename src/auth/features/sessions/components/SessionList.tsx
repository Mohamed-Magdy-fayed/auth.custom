import { authMessage, isFeatureEnabled } from "@/auth/config";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Muted } from "@/components/ui/typography";
import { listOwnSessions } from "../server/actions";
import { RevokeSessionButton } from "./RevokeSessionButton";

function formatDate(value: Date | string | null | undefined) {
    if (!value) return authMessage("session.list.unknownDate", "--");
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return authMessage("session.list.unknownDate", "--");
    }

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

function formatStatus(status: string) {
    switch (status) {
        case "active":
            return authMessage("session.status.active", "Active");
        case "revoked":
            return authMessage("session.status.revoked", "Revoked");
        case "expired":
            return authMessage("session.status.expired", "Expired");
        default:
            return status;
    }
}

export async function SessionList() {
    if (!isFeatureEnabled("sessions")) {
        return (
            <Muted>
                {authMessage(
                    "sessions.featureDisabled",
                    "Session management is disabled for this workspace.",
                )}
            </Muted>
        );
    }

    const sessions = await listOwnSessions();

    if (sessions.length === 0) {
        return (
            <Muted>
                {authMessage("session.list.empty", "No sessions found.")}
            </Muted>
        );
    }

    return (
        <div className="space-y-3">
            {sessions.map((session) => (
                <Card key={session.id} className="border-muted-foreground/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div>
                            <CardTitle className="text-base font-semibold">
                                {session.device ??
                                    authMessage(
                                        "session.device.unknown",
                                        "Unknown device",
                                    )}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                {session.platform ??
                                    session.userAgent ??
                                    authMessage(
                                        "session.platform.unknown",
                                        "Unknown platform",
                                    )}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant={session.isCurrent ? "default" : "outline"}>
                                {session.isCurrent
                                    ? authMessage(
                                        "session.status.current",
                                        "Current",
                                    )
                                    : formatStatus(session.status)}
                            </Badge>
                            <RevokeSessionButton
                                sessionId={session.id}
                                disabled={session.isCurrent || session.status !== "active"}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm text-muted-foreground">
                        <p>
                            <span className="font-medium text-foreground">
                                {authMessage(
                                    "session.list.lastActive",
                                    "Last active:",
                                )}
                            </span>{" "}
                            {formatDate(session.lastActiveAt)}
                        </p>
                        <p>
                            <span className="font-medium text-foreground">
                                {authMessage("session.list.created", "Created:")}
                            </span>{" "}
                            {formatDate(session.createdAt)}
                        </p>
                        <p>
                            <span className="font-medium text-foreground">
                                {authMessage("session.list.expires", "Expires:")}
                            </span>{" "}
                            {formatDate(session.expiresAt)}
                        </p>
                        {(session.ipAddress || session.country || session.city) && (
                            <p>
                                <span className="font-medium text-foreground">
                                    {authMessage("session.list.location", "Location:")}
                                </span>{" "}
                                {[session.city, session.country, session.ipAddress]
                                    .filter(Boolean)
                                    .join(" · ")}
                            </p>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
