"use client";

import { UserSchema } from "@bbrc/schemas";
import { Field, FieldLabel } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { refreshAuthSession } from "@/lib/refresh-auth-session";
import { orpc, queryClient } from "@/utils/orpc";

const NameInputSchema = UserSchema.pick({ name: true });

type SettingsNameFormProps = {
	currentName: string;
};

export function SettingsNameForm({ currentName }: SettingsNameFormProps) {
	const t = useTranslations("settings.name");
	const router = useRouter();
	const fieldId = useId();

	const [name, setName] = useState(currentName);
	const [fieldError, setFieldError] = useState<string | null>(null);

	const trimmedName = name.trim();
	const unchanged = trimmedName === currentName.trim();

	const saveMutation = useMutation(
		orpc.user.updateName.mutationOptions({
			onSuccess: async (result) => {
				await Promise.all([
					queryClient.invalidateQueries(),
					refreshAuthSession({ name: result.name }),
				]);

				toast.success(t("updated"));
				router.refresh();
			},
			onError: (error) => {
				toast.error(error.message ?? t("updateFailed"));
			},
		}),
	);

	const canSubmit =
		trimmedName.length > 0 && !unchanged && !saveMutation.isPending;

	return (
		<form
			className="flex flex-col gap-4"
			onSubmit={(event) => {
				event.preventDefault();
				setFieldError(null);

				const parsed = NameInputSchema.safeParse({
					name: trimmedName,
				});

				if (!parsed.success) {
					setFieldError(parsed.error.issues[0]?.message ?? t("invalid"));
					return;
				}

				if (!canSubmit) return;

				saveMutation.mutate({ name: parsed.data.name });
			}}
		>
			<Field>
				<FieldLabel htmlFor={fieldId}>{t("label")}</FieldLabel>

				<Input
					id={fieldId}
					name="name"
					autoComplete="name"
					value={name}
					disabled={saveMutation.isPending}
					aria-invalid={fieldError ? true : undefined}
					onChange={(event) => {
						setFieldError(null);
						setName(event.target.value);
					}}
				/>

				{fieldError && <p className="text-destructive text-sm">{fieldError}</p>}
			</Field>

			<LoadingButton
				type="submit"
				loading={saveMutation.isPending}
				disabled={!canSubmit}
				className="w-fit"
			>
				{t("save")}
			</LoadingButton>
		</form>
	);
}
