"use client";

import { SignupInputSchema } from "@bbrc/schemas";
import { FieldGroup } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useAppForm } from "@/hooks/use-app-form";
import { authClient } from "@/lib/auth-client";

export default function SignupForm() {
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();

	const form = useAppForm(SignupInputSchema, {
		name: "",
		email: "",
		username: "",
		password: "",
	});

	const onSubmit = form.handleSubmit(
		async (values) => {
			setIsLoading(true);

			try {
				const { data, error } = await authClient.signUp.email({
					name: values.name,
					email: values.email,
					username: values.username,
					password: values.password,
					callbackURL: "/",
				});

				if (error) {
					throw new Error(
						error.message ?? "Something went wrong. Please try again.",
					);
				}

				toast.success(`Welcome to BBRC, ${data.user.name}!`);

				router.replace("/");
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
					name="name"
					label="Full name"
					render={(field, fieldState) => (
						<Input
							id={field.name}
							placeholder="Martin Eden"
							aria-invalid={fieldState.invalid}
							{...field}
						/>
					)}
				/>

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
							onChange={(e) => {
								field.onChange(e.target.value?.toLowerCase() ?? "");
							}}
						/>
					)}
				/>

				<form.Input
					name="username"
					label="Username"
					render={(field, fieldState) => (
						<Input
							id={field.name}
							placeholder="leo_tolstoy"
							aria-invalid={fieldState.invalid}
							{...field}
							onChange={(e) => {
								field.onChange(e.target.value?.toLowerCase() ?? "");
							}}
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
							placeholder="At least 7 characters"
							aria-invalid={fieldState.invalid}
							{...field}
						/>
					)}
				/>

				<form.Submit
					className="w-full"
					loading={isLoading}
					loadingText="Creating account..."
				>
					Create account
				</form.Submit>
			</FieldGroup>
		</form>
	);
}
