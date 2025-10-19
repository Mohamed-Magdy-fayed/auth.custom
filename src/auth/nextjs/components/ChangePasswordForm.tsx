"use client"

import { useCallback, useState, useTransition } from "react"
import { useForm } from "react-hook-form"

import { authMessage } from "@/auth/config"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import { changePassword, createPassword } from "../profileActions"
import type { ChangePasswordInput, CreatePasswordInput } from "../profileSchemas"


export function ChangePasswordForm({ isCreate }: { isCreate?: boolean }) {
    type FormValues = typeof isCreate extends true ? CreatePasswordInput : ChangePasswordInput

    const [status, setStatus] = useState<{ type: "success" | "error"; message: string }>()
    const [isPending, startTransition] = useTransition()

    const form = useForm<FormValues>({
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    })

    const onSubmit = useCallback(
        (values: FormValues) => {
            startTransition(async () => {
                form.clearErrors()
                setStatus(undefined)

                const result = isCreate ? await createPassword(values) : await changePassword(values)

                if (!result.success) {
                    if (result.fieldErrors) {
                        for (const [field, messages] of Object.entries(result.fieldErrors)) {
                            const message = messages
                            if (message) {
                                form.setError(field as keyof FormValues, {
                                    type: "server",
                                    message,
                                })
                            }
                        }
                    }

                    if (result.message) {
                        setStatus({ type: "error", message: result.message })
                    }
                    return
                }

                form.reset()
                if (result.message) {
                    setStatus({ type: "success", message: result.message })
                }
            })
        },
        [form]
    )

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {status && (
                    <p
                        className={status.type === "success" ? "text-sm text-emerald-600" : "text-sm text-destructive"}
                    >
                        {status.message}
                    </p>
                )}
                {!isCreate && <FormField
                    control={form.control}
                    name="currentPassword"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                {authMessage("profile.password.currentLabel", "Current password")}
                            </FormLabel>
                            <FormControl>
                                <Input type="password" autoComplete="current-password" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />}
                <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                {authMessage("profile.password.newLabel", "New password")}
                            </FormLabel>
                            <FormControl>
                                <Input type="password" autoComplete="new-password" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                {authMessage(
                                    "profile.password.confirmLabel",
                                    "Confirm new password"
                                )}
                            </FormLabel>
                            <FormControl>
                                <Input type="password" autoComplete="new-password" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="flex justify-end">
                    <Button type="submit" disabled={isPending}>
                        {isPending
                            ? authMessage("profile.password.updating", "Updating...")
                            : authMessage("profile.password.submit", "Update password")}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
