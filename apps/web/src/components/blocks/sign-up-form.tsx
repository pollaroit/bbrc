"use client";

import { SignupInputSchema } from "@bbrc/schemas";
import { FieldGroup } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useAppForm } from "@/hooks/use-app-form";
import { useRouter } from "@/i18n/navigation";
import { safeCallbackUrl } from "@/lib/auth-callback-url";
import { authClient } from "@/lib/auth-client";
import { authErrorKey } from "@/lib/auth-error-message";

export default function SignupForm() {
	const t = useTranslations("auth");
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();
	const searchParams = useSearchParams();
	const callbackUrl = safeCallbackUrl(searchParams.get("callback_url"));

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
					callbackURL: callbackUrl,
				});

				if (error) {
					toast.error(t(`errors.${authErrorKey(error)}`));
					return;
				}

				toast.success(t("signUp.welcome", { name: data.user.name }));

				router.replace(callbackUrl);
			} catch {
				toast.error(t("errors.generic"));
			} finally {
				setIsLoading(false);
			}
		},
		(errors) => {
			toast.error(errors.root?.message ?? t("errors.generic"));
		},
	);

	return (
		<form onSubmit={onSubmit} noValidate>
			<FieldGroup>
				<form.Input
					name="name"
					label={t("signUp.name")}
					render={(field, fieldState) => (
						<Input
							id={field.name}
							placeholder={t("signUp.namePlaceholder")}
							aria-invalid={fieldState.invalid}
							{...field}
						/>
					)}
				/>

				<form.Input
					name="email"
					label={t("signUp.email")}
					render={(field, fieldState) => (
						<Input
							id={field.name}
							type="email"
							placeholder={t("signUp.emailPlaceholder")}
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
					label={t("signUp.username")}
					render={(field, fieldState) => (
						<Input
							id={field.name}
							placeholder={t("signUp.usernamePlaceholder")}
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
					label={t("signUp.password")}
					render={(field, fieldState) => (
						<Input
							id={field.name}
							type="password"
							placeholder={t("signUp.passwordPlaceholder")}
							aria-invalid={fieldState.invalid}
							{...field}
						/>
					)}
				/>

				<form.Submit
					className="w-full"
					loading={isLoading}
					loadingText={t("signUp.submitting")}
				>
					{t("signUp.submit")}
				</form.Submit>
			</FieldGroup>
		</form>
	);
}
