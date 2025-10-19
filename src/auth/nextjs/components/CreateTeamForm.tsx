"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { authMessage } from "@/auth/config";
import { SelectField } from "@/components/generale/select-field";
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
import { createTeam } from "../org/actions";
import { type CreateTeamInput, createTeamSchema } from "../org/schemas";

type CreateTeamFormProps = {
    organizationId: string;
    parentTeams: Array<{ id: string; name: string }>;
};

type FormValues = CreateTeamInput & { description?: string };

export function CreateTeamForm({
    organizationId,
    parentTeams,
}: CreateTeamFormProps) {
    const [status, setStatus] = useState<{
        type: "success" | "error";
        message: string;
    }>();
    const [isPending, startTransition] = useTransition();

    const form = useForm<FormValues>({
        resolver: zodResolver(createTeamSchema),
        defaultValues: {
            organizationId,
            name: "",
            description: "",
            parentTeamId: "",
        },
    });

    const handleSubmit = (values: FormValues) => {
        startTransition(async () => {
            form.clearErrors();
            setStatus(undefined);

            const result = await createTeam({
                organizationId,
                name: values.name.trim(),
                description:
                    values.description && values.description.trim().length > 0
                        ? values.description.trim()
                        : undefined,
                parentTeamId:
                    values.parentTeamId && values.parentTeamId.length > 0
                        ? values.parentTeamId
                        : undefined,
            });

            if (!result.success) {
                if ("fieldErrors" in result && result.fieldErrors) {
                    for (const [field, messages] of Object.entries(result.fieldErrors)) {
                        const message = (messages as string[] | undefined)?.[0];
                        if (message) {
                            form.setError(field as keyof FormValues, { type: "server", message });
                        }
                    }
                }

                if (result.message) {
                    setStatus({ type: "error", message: result.message });
                }
                return;
            }

            form.reset({ organizationId, name: "", description: "", parentTeamId: "" });

            if (result.message) {
                setStatus({ type: "success", message: result.message });
            }
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {status && (
                    <p
                        className={
                            status.type === "success"
                                ? "text-sm text-emerald-600"
                                : "text-sm text-destructive"
                        }
                    >
                        {status.message}
                    </p>
                )}
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                {authMessage("teams.create.nameLabel", "Team name")}
                            </FormLabel>
                            <FormControl>
                                <Input
                                    placeholder={authMessage("teams.create.namePlaceholder", "Growth")}
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                {authMessage("teams.create.descriptionLabel", "Description")}
                            </FormLabel>
                            <FormControl>
                                <Input
                                    placeholder={authMessage(
                                        "teams.create.descriptionPlaceholder",
                                        "Optional description",
                                    )}
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="parentTeamId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                {authMessage("teams.create.parentLabel", "Parent team")}
                            </FormLabel>
                            <FormControl>
                                <SelectField
                                    options={parentTeams.map((team) => ({
                                        label: team.name,
                                        value: team.id,
                                    }))}
                                    setValues={(vals) => field.onChange(vals[0] || "")}
                                    values={field.value ? [field.value] : []}
                                    title="Teams"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="flex justify-end">
                    <Button type="submit" disabled={isPending}>
                        {isPending
                            ? authMessage("teams.create.submitting", "Creating...")
                            : authMessage("teams.create.submit", "Create team")}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
