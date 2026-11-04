"use client";

import { passwordSchema } from "@bbrc/schemas";
import { FieldGroup } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { PasswordRequirements } from "@/components/blocks/password-requirements";
import { useAppForm } from "@/hooks/use-app-form";
import { authClient } from "@/lib/auth-client";

const ResetPasswordSchema = z
	.object({
		newPassword: passwordSchema,
		confirmPassword: z.string(),
	})
	.refine((values) => values.newPassword === values.confirmPassword, {
		message: "Passwords do not match.",
		path: ["confirmPassword"],
	});

export function ResetPasswordForm({ token }: { token: string | null }) {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);

	const form = useAppForm(ResetPasswordSchema, {
		newPassword: "",
		confirmPassword: "",
	});

	if (!token) {
		return (
			<p className="text-muted-foreground text-sm leading-relaxed">
				This reset link is invalid or expired. Request a new one from the{" "}
				<Link
					href={"/forgot-password" as Route}
					className="text-foreground underline"
				>
					forgot password
				</Link>{" "}
				page.
			</p>
		);
	}

	const onSubmit = form.handleSubmit(
		async (values) => {
			setIsLoading(true);
			try {
				const { error } = await authClient.resetPassword({
					newPassword: values.newPassword,
					token,
				});

				if (error) {
					throw new Error(
						error.message ?? "Something went wrong. Please try again.",
					);
				}

				toast.success("Password updated. You can sign in now.");
				router.replace("/sign-in" as Route);
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
		<form onSubmit={onSubmit} noValidate>
			<FieldGroup>
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
					label="Confirm password"
					render={(field, fieldState) => (
						<Input
							id={field.name}
							type="password"
							autoComplete="new-password"
							placeholder="Re-enter your password"
							aria-invalid={fieldState.invalid}
							{...field}
						/>
					)}
				/>
				<form.Submit
					className="w-full"
					loading={isLoading}
					loadingText="Saving..."
				>
					Save new password
				</form.Submit>
			</FieldGroup>
		</form>
	);
}
