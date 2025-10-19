import Link from "next/link";
import { authMessage } from "@/auth/config";
import { verifyEmailChange } from "@/auth/nextjs/emailActions";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export default async function VerifyEmailPage({
    searchParams,
}: {
    searchParams: Promise<{ token?: string }>;
}) {
    const { token } = await searchParams;
    const result = token
        ? await verifyEmailChange(token)
        : {
            status: "error" as const,
            message: authMessage(
                "emailVerification.error.invalidToken",
                "Invalid email verification link.",
            ),
        };

    return (
        <div className="container mx-auto p-4 max-w-[650px]">
            <Card>
                <CardHeader>
                    <CardTitle>
                        {authMessage("emailVerification.heading", "Email verification")}
                    </CardTitle>
                    <CardDescription>
                        {result.status === "success"
                            ? authMessage(
                                "emailVerification.description.success",
                                "Your email address is now verified.",
                            )
                            : authMessage(
                                "emailVerification.description.error",
                                "We could not verify your email address.",
                            )}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p
                        className={
                            result.status === "success"
                                ? "text-sm text-emerald-600"
                                : "text-sm text-destructive"
                        }
                    >
                        {result.message}
                    </p>
                    <div className="flex gap-3">
                        <Button asChild variant="outline">
                            <Link href="/">{authMessage("emailVerification.backHome", "Home")}</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/sign-in">
                                {authMessage("emailVerification.backToSignIn", "Sign in")}
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
