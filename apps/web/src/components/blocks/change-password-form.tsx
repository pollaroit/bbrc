"use client";

import { passwordSchema } from "@bbrc/schemas";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import { FieldGroup } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { Label } from "@bbrc/ui/components/label";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { PasswordRequirements } from "@/components/blocks/password-requirements";
import { useAppForm } from "@/hooks/use-app-form";
import { authClient } from "@/lib/auth-client";

const ChangePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, "Enter your current password."),
		newPassword: passwordSchema,
		confirmPassword: z.string(),
	})
	.refine((values) => values.newPassword === values.confirmPassword, {
		message: "Passwords do not match.",
		path: ["confirmPassword"],
	});

export function ChangePasswordForm() {
	const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);
	const [isLoading, setIsLoading] = useState(false);

	const form = useAppForm(ChangePasswordSchema, {
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});

	const onSubmit = form.handleSubmit(
		async (values) => {
			setIsLoading(true);
			try {
				const { error } = await authClient.changePassword({
					currentPassword: values.currentPassword,
					newPassword: values.newPassword,
					revokeOtherSessions,
				});

				if (error) {
					throw new Error(
						error.message ?? "Something went wrong. Please try again.",
					);
				}

				form.reset({
					currentPassword: "",
					newPassword: "",
					confirmPassword: "",
				});
				toast.success("Password updated.");
			} catch (error) {
				toast.error(
					(error as Error).message ?? "Something went wrong. Please try again.",
				);
			} finally {
				setIsLoading(false);
			}
		},
		(errors) => {
			toast.error(
				errors.root?.message ?? "Something went wrong. Please try again.",
			);
		},
	);

	return (
		<form onSubmit={onSubmit} noValidate className="max-w-md">
			<FieldGroup>
				<form.Input
					name="currentPassword"
					label="Current password"
					render={(field, fieldState) => (
						<Input
							id={field.name}
							type="password"
							autoComplete="current-password"
							aria-invalid={fieldState.invalid}
							{...field}
						/>
					)}
				/>
				<form.Input
					name="newPassword"
					label="New password"
					render={(field, fieldState) => (
						<Input
							id={field.name}
							type="password"
							autoComplete="new-password"
							placeholder="Create a new password"
							aria-invalid={fieldState.invalid}
							{...field}
						/>
					)}
				/>
				<PasswordRequirements />
				<form.Input
					name="confirmPassword"
					label="Confirm new password"
					render={(field, fieldState) => (
						<Input
							id={field.name}
							type="password"
							autoComplete="new-password"
							aria-invalid={fieldState.invalid}
							{...field}
						/>
					)}
				/>
				<div className="flex items-start gap-2">
					<Checkbox
						id="revoke-other-sessions"
						checked={revokeOtherSessions}
						onCheckedChange={(checked) =>
							setRevokeOtherSessions(checked === true)
						}
					/>
					<Label
						htmlFor="revoke-other-sessions"
						className="cursor-pointer font-normal leading-snug"
					>
						Sign out other devices after changing my password
					</Label>
				</div>
				<form.Submit loading={isLoading} loadingText="Saving...">
					Save password
				</form.Submit>
			</FieldGroup>
		</form>
	);
}
