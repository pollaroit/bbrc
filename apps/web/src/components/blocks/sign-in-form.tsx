"use client";

import { SignInInputSchema } from "@bbrc/schemas";
import { FieldGroup } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useAppForm } from "@/hooks/use-app-form";
import { safeCallbackUrl } from "@/lib/auth-callback-url";
import { authClient } from "@/lib/auth-client";

export default function SignInForm() {
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();
	const searchParams = useSearchParams();
	const callbackUrl = safeCallbackUrl(searchParams.get("callback_url"));

	const form = useAppForm(SignInInputSchema, {
		email: "",
		password: "",
	});

	const onSubmit = form.handleSubmit(
		async (values) => {
			setIsLoading(true);
			try {
				const { data, error } = await authClient.signIn.email({
					email: values.email,
					password: values.password,
					callbackURL: callbackUrl,
				});

				if (error) {
					throw new Error(
						error.message ?? "Something went wrong. Please try again.",
					);
				}

				toast.success(`Welcome back, ${data.user.name}!`);

				router.replace(callbackUrl);
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
					name="email"
					label="Email"
					render={(field, fieldState) => (
						<Input
							id={field.name}
							type="email"
							placeholder="leo_tolstoy@example.com"
							aria-invalid={fieldState.invalid}
							{...field}
						/>
					)}
				/>

				<form.Input
					name="password"
					label="Password"
					render={(field, fieldState) => (
						<Input
							id={field.name}
							type="password"
							placeholder="Enter your password"
							aria-invalid={fieldState.invalid}
							{...field}
						/>
					)}
				/>

				<form.Submit
					className="w-full"
					loading={isLoading}
					loadingText="Signing in..."
				>
					Sign in
				</form.Submit>
			</FieldGroup>
		</form>
	);
}
