"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { authMessage } from "@/auth/config";
import {
    type RemoteSearchOption,
    RemoteSelectField,
} from "@/components/generale/remote-select-field";
import { SelectField } from "@/components/generale/select-field";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from "@/components/ui/input-group";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { addTeamMember, searchTeamInvitees } from "../org/actions";
import { addTeamMemberSchema } from "../org/schemas";

type AddTeamMemberFormProps = {
    teams: Array<{ id: string; name: string }>;
    teamRoles: Array<{ id: string; name: string; description: string | null; isDefault: boolean }>;
    disabledReason?: string;
};

type FormValues = {
    teamId: string;
    email: string;
    roleId?: string;
    isNew?: boolean;
};

export function AddTeamMemberForm({
    teams,
    teamRoles,
    disabledReason,
}: AddTeamMemberFormProps) {
    const [status, setStatus] = useState<{
        type: "success" | "error";
        message: string;
    }>();
    const [isPending, startTransition] = useTransition();
    const [inviteeSelection, setInviteeSelection] = useState<
        RemoteSearchOption<string>[]
    >([]);

    const defaultRoleId = teamRoles.find((role) => role.isDefault)?.id ?? "";
    const form = useForm<FormValues>({
        resolver: zodResolver(addTeamMemberSchema),
        defaultValues: {
            teamId: teams[0]?.id ?? "",
            email: "",
            roleId: defaultRoleId || "",
        },
    });

    useEffect(() => {
        form.resetField("teamId", { defaultValue: teams[0]?.id ?? "" });
        form.resetField("email", { defaultValue: "" });
        form.resetField("roleId", { defaultValue: defaultRoleId || "" });
        setInviteeSelection([]);
    }, [form, teams, defaultRoleId]);

    const hasTeams = teams.length > 0;
    const selectedTeam = form.watch("teamId");

    const handleSubmit = (values: FormValues) => {
        startTransition(async () => {
            form.clearErrors();
            setStatus(undefined);

            if (!hasTeams) {
                setStatus({
                    type: "error",
                    message:
                        disabledReason ??
                        authMessage("teams.members.noTeam", "Create a team first"),
                });
                return;
            }

            const result = await addTeamMember({
                teamId: values.teamId,
                email: values.email.trim(),
                roleId: values.roleId && values.roleId.length > 0 ? values.roleId : undefined,
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

            form.reset({
                teamId: teams[0]?.id ?? "",
                email: "",
                roleId: defaultRoleId || "",
            });
            setInviteeSelection([]);

            if (result.message) {
                setStatus({ type: "success", message: result.message });
            }
        });
    };

    const handleInviteeSearch = useCallback(
        async (query: string) => {
            if (!selectedTeam) {
                return {
                    success: false as const,
                    error: authMessage(
                        "teams.members.selectTeamFirst",
                        "Select a team to search for members",
                    ),
                };
            }

            return searchTeamInvitees({ teamId: selectedTeam, query });
        },
        [selectedTeam],
    );

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {status && status.message && (
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
                {!hasTeams && disabledReason && (
                    <p className="text-sm text-muted-foreground">{disabledReason}</p>
                )}
                <FormField
                    control={form.control}
                    name="teamId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{authMessage("teams.members.teamLabel", "Team")}</FormLabel>
                            <FormControl>
                                <SelectField
                                    options={teams.map((team) => ({ label: team.name, value: team.id }))}
                                    setValues={(vals) => field.onChange(vals[0] || "")}
                                    values={field.value ? [field.value] : []}
                                    title="Teams"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="roleId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{authMessage("teams.members.roleLabel", "Team role")}</FormLabel>
                            <FormControl>
                                <SelectField
                                    options={teamRoles.map((role) => ({
                                        label: role.name,
                                        value: role.id,
                                    }))}
                                    setValues={(vals) => field.onChange(vals[0] || "")}
                                    values={field.value ? [field.value] : []}
                                    title={authMessage("teams.members.rolePlaceholder", "Assign role")}
                                    disabled={teamRoles.length === 0}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{authMessage("teams.members.emailLabel", "Email")}</FormLabel>
                            <FormControl>
                                <ButtonGroup className="[&>*]:flex-1 w-full">
                                    <RemoteSelectField
                                        title={authMessage(
                                            "teams.members.emailPlaceholder",
                                            "Select existing user",
                                        )}
                                        selected={inviteeSelection}
                                        onSelectedChange={(next) => {
                                            setInviteeSelection(next);
                                            const nextValue = next[0]?.value ?? "";
                                            field.onChange(nextValue);
                                            if (next.length === 0) {
                                                void form.trigger("email");
                                            } else {
                                                form.clearErrors("email");
                                            }
                                        }}
                                        searchAction={handleInviteeSearch}
                                        disabled={!hasTeams || !selectedTeam || isPending}
                                        multiple={false}
                                        minQueryLength={3}
                                    />
                                    <InputGroup className="h-8">
                                        <InputGroupInput
                                            placeholder={authMessage("teams.members.emailPlaceholder", "Email")}
                                            value={field.value}
                                            onChange={(e) => field.onChange(e.target.value)}
                                            disabled={!hasTeams || !selectedTeam || isPending}
                                        />
                                        <InputGroupAddon align="inline-end">
                                            <InputGroupButton asChild size="xs">
                                                <ActionButton
                                                    disabled={!field.value || isPending}
                                                    variant="ghost"
                                                    action={addTeamMember.bind(null, {
                                                        email: field.value,
                                                        teamId: selectedTeam!,
                                                        isNew: true,
                                                        roleId: form.getValues("roleId") || undefined,
                                                    })}
                                                >
                                                    <PlusIcon />
                                                    Add
                                                </ActionButton>
                                            </InputGroupButton>
                                        </InputGroupAddon>
                                    </InputGroup>
                                </ButtonGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="flex justify-end">
                    <Button type="submit" disabled={!hasTeams || isPending || !selectedTeam}>
                        <LoadingSwap
                            isLoading={isPending}
                            text={authMessage("teams.members.adding", "Adding...")}
                        >
                            {!hasTeams
                                ? (disabledReason ??
                                    authMessage("teams.members.noTeam", "Create a team first"))
                                : !selectedTeam
                                    ? authMessage("teams.members.noTeamSelected", "Select a team")
                                    : authMessage("teams.members.submit", "Add member")}
                        </LoadingSwap>
                    </Button>
                </div>
            </form>
        </Form>
    );
}
