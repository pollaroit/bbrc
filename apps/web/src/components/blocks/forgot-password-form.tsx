"use client";

import { FieldGroup } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useAppForm } from "@/hooks/use-app-form";
import { authClient } from "@/lib/auth-client";
import { resetPasswordRedirectUrl } from "@/lib/auth-routes";

const ForgotPasswordSchema = z.object({
	email: z.email(),
});

export function ForgotPasswordForm() {
	const [sent, setSent] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const form = useAppForm(ForgotPasswordSchema, { email: "" });

	const onSubmit = form.handleSubmit(
		async (values) => {
			setIsLoading(true);
			try {
				const origin = window.location.origin;
				const { error } = await authClient.requestPasswordReset({
					email: values.email,
					redirectTo: resetPasswordRedirectUrl(origin),
				});

				if (error) {
					throw new Error(
						error.message ?? "Something went wrong. Please try again.",
					);
				}

				setSent(true);
				toast.success("If that email is on file, we sent a reset link.");
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

	if (sent) {
		return (
			<p className="text-muted-foreground text-sm leading-relaxed">
				If an account exists for that address, check your inbox for a reset
				link. It expires in one hour.{" "}
				<Link href={"/sign-in" as Route} className="text-foreground underline">
					Back to sign in
				</Link>
			</p>
		);
	}

	return (
		<form onSubmit={onSubmit} noValidate>
			<FieldGroup>
				<form.Input
					name="email"
					label="Email"
					render={(field, fieldState) => (
						<Input
							id={field.name}
							type="email"
							placeholder="leo_tolstoy@example.com"
							autoComplete="email"
							aria-invalid={fieldState.invalid}
							{...field}
						/>
					)}
				/>
				<form.Submit
					className="w-full"
					loading={isLoading}
					loadingText="Sending link..."
				>
					Send reset link
				</form.Submit>
			</FieldGroup>
		</form>
	);
}
