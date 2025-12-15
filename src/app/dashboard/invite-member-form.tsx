"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { sendInvitation } from "@/auth/features/org/server/actions";
import {
    type InviteMemberInput,
    inviteMemberSchema,
} from "@/auth/features/org/server/schemas";
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
import { LoadingSwap } from "@/components/ui/loading-swap";
import { useTranslation } from "@/lib/i18n/useTranslation";

type InviteMemberFormProps = {
    organizationName?: string;
};

type FormValues = InviteMemberInput;

export function InviteMemberForm({ organizationName }: InviteMemberFormProps) {
    const { t } = useTranslation();
    const [status, setStatus] = useState<
        | { type: "success"; message: string }
        | { type: "error"; message: string }
    >();
    const [isPending, startTransition] = useTransition();

    const form = useForm<FormValues>({
        resolver: zodResolver(inviteMemberSchema),
        defaultValues: { email: "" },
    });

    const handleSubmit = (values: FormValues) => {
        startTransition(async () => {
            setStatus(undefined);
            form.clearErrors();

            const result = await sendInvitation({ email: values.email.trim() });

            if (!result.success) {
                if (result.fieldErrors?.email) {
                    form.setError("email", { type: "server", message: result.fieldErrors.email });
                }

                if (result.message) {
                    setStatus({ type: "error", message: result.message });
                }
                return;
            }

            form.reset({ email: "" });
            if (result.message) {
                setStatus({ type: "success", message: result.message });
            }
        });
    };

    const labelOrganization =
        organizationName ?? t("dashboardPage.invites.form.organizationFallback");

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem className="flex-1">
                                <FormLabel>
                                    {t("dashboardPage.invites.form.label", { organization: labelOrganization })}
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        type="email"
                                        disabled={isPending}
                                        placeholder={t("dashboardPage.invites.form.placeholder")}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="shrink-0" disabled={isPending}>
                        <LoadingSwap isLoading={isPending} text={t("dashboardPage.invites.form.submitting")}
                        >
                            {t("dashboardPage.invites.form.submit")}
                        </LoadingSwap>
                    </Button>
                </div>
                {status ? (
                    <p
                        className={
                            status.type === "success"
                                ? "text-sm text-emerald-600"
                                : "text-sm text-destructive"
                        }
                    >
                        {status.message}
                    </p>
                ) : null}
            </form>
        </Form>
    );
}
