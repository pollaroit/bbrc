"use client";

import { UserSchema } from "@bbrc/schemas";
import { USERNAME_UPDATE_COOLDOWN_DAYS } from "@bbrc/shared";
import { Field, FieldDescription, FieldLabel } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { refreshAuthSession } from "@/lib/refresh-auth-session";
import { orpc, queryClient } from "@/utils/orpc";

const UsernameInputSchema = UserSchema.pick({ username: true });

type UsernameT = ReturnType<typeof useTranslations<"settings.username">>;
type Formatters = ReturnType<typeof useFormatters>;

/** "3 days", "5 hours", "12 minutes": the time left until `target`, in the page language. */
function remainingText(t: UsernameT, target: Date): string {
	const ms = target.getTime() - Date.now();
	if (ms <= 0) return t("now");
	const minutes = Math.ceil(ms / 60_000);
	if (minutes < 60) return t("remainingMinutes", { count: minutes });
	const hours = Math.ceil(minutes / 60);
	if (hours < 48) return t("remainingHours", { count: hours });
	return t("remainingDays", { count: Math.ceil(hours / 24) });
}

function usernameStatusDescription(
	t: UsernameT,
	f: Formatters,
	status: {
		usernameLastUpdatedAt: Date | null;
		canUpdate: boolean;
		nextAllowedAt: Date | null;
	},
): string {
	const cooldown = t("cooldown", { days: USERNAME_UPDATE_COOLDOWN_DAYS });
	const dateTime = (value: Date) =>
		f.dateWith(value, { dateStyle: "medium", timeStyle: "short" });

	if (!status.usernameLastUpdatedAt) {
		return t("neverChanged", { cooldown });
	}

	const lastChanged = dateTime(status.usernameLastUpdatedAt);

	if (status.canUpdate) {
		return t("canUpdate", { cooldown, lastChanged });
	}

	return t("mustWait", {
		cooldown,
		lastChanged,
		nextAt: status.nextAllowedAt ? dateTime(status.nextAllowedAt) : t("later"),
		remaining: status.nextAllowedAt
			? remainingText(t, status.nextAllowedAt)
			: t("aWhile"),
	});
}

export function SettingsUsernameForm() {
	const t = useTranslations("settings.username");
	const f = useFormatters();
	const router = useRouter();
	const fieldId = useId();
	const [username, setUsername] = useState("");
	const [fieldError, setFieldError] = useState<string | null>(null);

	const statusQuery = useQuery({
		...orpc.user.getUsernameUpdateStatus.queryOptions(),
	});

	useEffect(() => {
		if (statusQuery.data?.username) {
			setUsername(statusQuery.data.username);
		}
	}, [statusQuery.data?.username]);

	const trimmed = username.trim().toLowerCase();
	const unchanged = statusQuery.data
		? trimmed === statusQuery.data.username
		: true;

	const canSubmit = Boolean(
		statusQuery.data?.canUpdate && !unchanged && trimmed.length > 0,
	);

	const saveMutation = useMutation(
		orpc.user.updateUsername.mutationOptions({
			onSuccess: async (result) => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: orpc.user.getUsernameUpdateStatus.key(),
					}),
					refreshAuthSession({ username: result.username }),
				]);
				toast.success(t("updated"));
				router.push(`/users/${result.username}` as Route);
				router.refresh();
			},
			onError: (error) => {
				toast.error(error.message ?? t("updateFailed"));
			},
		}),
	);

	const description = useMemo(() => {
		if (!statusQuery.data) {
			return null;
		}
		return usernameStatusDescription(t, f, {
			usernameLastUpdatedAt: statusQuery.data.usernameLastUpdatedAt
				? new Date(statusQuery.data.usernameLastUpdatedAt)
				: null,
			canUpdate: statusQuery.data.canUpdate,
			nextAllowedAt: statusQuery.data.nextAllowedAt
				? new Date(statusQuery.data.nextAllowedAt)
				: null,
		});
	}, [statusQuery.data, t, f]);

	if (statusQuery.isPending) {
		return <p className="text-muted-foreground text-sm">{t("loading")}</p>;
	}

	if (statusQuery.isError || !statusQuery.data) {
		return <p className="text-destructive text-sm">{t("loadFailed")}</p>;
	}

	return (
		<form
			className="flex flex-col gap-4"
			onSubmit={(event) => {
				event.preventDefault();
				setFieldError(null);

				const parsed = UsernameInputSchema.safeParse({ username: trimmed });
				if (!parsed.success) {
					const message = parsed.error.issues[0]?.message ?? t("invalid");
					setFieldError(message);
					return;
				}

				if (!canSubmit) {
					return;
				}

				saveMutation.mutate({ username: parsed.data.username });
			}}
		>
			<Field>
				<FieldLabel htmlFor={fieldId}>{t("label")}</FieldLabel>
				{description ? (
					<FieldDescription className="max-w-[65ch] leading-relaxed">
						{description}
					</FieldDescription>
				) : null}
				<Input
					id={fieldId}
					name="username"
					autoComplete="username"
					spellCheck={false}
					value={username}
					disabled={!statusQuery.data.canUpdate || saveMutation.isPending}
					aria-invalid={fieldError ? true : undefined}
					onChange={(event) => {
						setFieldError(null);
						setUsername(event.target.value.toLowerCase());
					}}
				/>
				{fieldError ? (
					<p className="text-destructive text-sm">{fieldError}</p>
				) : null}
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
