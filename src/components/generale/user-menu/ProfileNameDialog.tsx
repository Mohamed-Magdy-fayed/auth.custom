"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { updateProfile } from "@/auth/nextjs/profileActions";
import { Button } from "@/components/ui/button";
import {
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export type ProfileNameDialogProps = { initialName: string };

type FormValues = { name: string };

export function ProfileNameDialog({ initialName }: ProfileNameDialogProps) {
	const [status, setStatus] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);
	const [isPending, startTransition] = useTransition();
	const form = useForm<FormValues>({ defaultValues: { name: initialName } });

	useEffect(() => {
		form.reset({ name: initialName });
	}, [form, initialName]);

	const handleSubmit = useCallback(
		(values: FormValues) => {
			startTransition(async () => {
				form.clearErrors();
				setStatus(null);

				const trimmed = values.name.trim();
				if (trimmed.length === 0) {
					form.setError("name", { type: "manual", message: "Enter a name" });
					setStatus({ type: "error", message: "Name is required" });
					return;
				}

				try {
					const result = await updateProfile({ name: trimmed });
					if (!result.success) {
						const fieldError = result.fieldErrors?.name;
						if (fieldError) {
							form.setError("name", { type: "server", message: fieldError });
						}
						setStatus({
							type: "error",
							message: result.message ?? "Unable to update name",
						});
						return;
					}

					setStatus({ type: "success", message: result.message ?? "Name updated" });
				} catch (error) {
					console.error("Failed to update profile name", error);
					setStatus({ type: "error", message: "Unable to update name" });
				}
			});
		},
		[form],
	);

	return (
		<DialogContent className="sm:max-w-md">
			<DialogHeader>
				<DialogTitle>Profile name</DialogTitle>
				<DialogDescription>
					Update how your name appears across the app.
				</DialogDescription>
			</DialogHeader>
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
								<FormLabel>Display name</FormLabel>
								<FormControl>
									<Input autoComplete="name" placeholder="Your name" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<div className="flex justify-end">
						<Button type="submit" disabled={isPending}>
							{isPending ? "Saving..." : "Save"}
						</Button>
					</div>
				</form>
			</Form>
		</DialogContent>
	);
}
