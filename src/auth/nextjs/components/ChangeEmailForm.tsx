"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { authMessage } from "@/auth/config";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { requestEmailChange } from "../emailActions";
import { changeEmailSchema } from "../profileSchemas";

type FormValues = z.infer<typeof changeEmailSchema>;

type ChangeEmailFormProps = { currentEmail: string };

export function ChangeEmailForm({ currentEmail }: ChangeEmailFormProps) {
    const [status, setStatus] = useState<{
        success: boolean;
        message: string;
    } | null>(null);
    const [isPending, startTransition] = useTransition();

    const form = useForm<FormValues>({
        resolver: zodResolver(changeEmailSchema),
        defaultValues: { newEmail: "", confirmEmail: "", currentPassword: "" },
    });

    function onSubmit(values: FormValues) {
        startTransition(async () => {
            setStatus(null);
            form.clearErrors();

            const result = await requestEmailChange(values);
            setStatus({
                success: result.success,
                message:
                    result.message ??
                    (result.success
                        ? authMessage(
                            "profile.email.success.changeRequested",
                            "Check your new inbox for a verification link.",
                        )
                        : authMessage("profile.email.error.generic", "Unable to update email.")),
            });

            if (!result.success && result.fieldErrors) {
                for (const [field, messages] of Object.entries(result.fieldErrors)) {
                    const message = messages?.[0];
                    if (message) {
                        form.setError(field as keyof FormValues, { type: "server", message });
                    }
                }
            }

            if (result.success) {
                form.reset({ newEmail: "", confirmEmail: "", currentPassword: "" });
            }
        });
    }

    return (
        <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                <p className="text-sm text-muted-foreground">
                    {authMessage("profile.email.current", "Current email:")} {currentEmail}
                </p>
                {status && (
                    <p
                        className={
                            status.success ? "text-sm text-emerald-600" : "text-sm text-destructive"
                        }
                    >
                        {status.message}
                    </p>
                )}
                <FormField
                    control={form.control}
                    name="newEmail"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                {authMessage("profile.email.newLabel", "New email")}
                            </FormLabel>
                            <FormControl>
                                <Input type="email" autoComplete="email" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="confirmEmail"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                {authMessage("profile.email.confirmLabel", "Confirm new email")}
                            </FormLabel>
                            <FormControl>
                                <Input type="email" autoComplete="email" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="currentPassword"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                {authMessage(
                                    "profile.email.currentPasswordLabel",
                                    "Current password (required if you set one)",
                                )}
                            </FormLabel>
                            <FormControl>
                                <Input type="password" autoComplete="current-password" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="flex justify-end">
                    <Button type="submit" disabled={isPending}>
                        {isPending
                            ? authMessage("profile.email.sending", "Sending...")
                            : authMessage("profile.email.submit", "Send verification")}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
