"use client";

import { UserSchema } from "@bbrc/schemas";
import { USERNAME_UPDATE_COOLDOWN_DAYS } from "@bbrc/shared";
import { Field, FieldDescription, FieldLabel } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { formatDateTime, formatDurationUntil } from "@/lib/format-datetime";
import { refreshAuthSession } from "@/lib/refresh-auth-session";
import { orpc, queryClient } from "@/utils/orpc";

const UsernameInputSchema = UserSchema.pick({ username: true });

function usernameStatusDescription(status: {
	username: string;
	usernameLastUpdatedAt: Date | null;
	canUpdate: boolean;
	nextAllowedAt: Date | null;
}): string {
	const cooldown = `You can change your username once every ${USERNAME_UPDATE_COOLDOWN_DAYS} days.`;

	if (!status.usernameLastUpdatedAt) {
		return `${cooldown} You have not changed it since signup, so you can update it now. Profile links use your username.`;
	}

	const lastChanged = formatDateTime(status.usernameLastUpdatedAt);

	if (status.canUpdate) {
		return `${cooldown} Last changed ${lastChanged}. You can update it now.`;
	}

	const nextAt = status.nextAllowedAt
		? formatDateTime(status.nextAllowedAt)
		: "later";
	const remaining = status.nextAllowedAt
		? formatDurationUntil(status.nextAllowedAt)
		: "a while";

	return `${cooldown} Last changed ${lastChanged}. You can change it again in ${remaining} (${nextAt}).`;
}

export function SettingsUsernameForm() {
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
				toast.success("Username updated");
				router.push(`/users/${result.username}` as Route);
				router.refresh();
			},
			onError: (error) => {
				toast.error(error.message ?? "Could not update username");
			},
		}),
	);

	const description = useMemo(() => {
		if (!statusQuery.data) {
			return null;
		}
		return usernameStatusDescription({
			username: statusQuery.data.username,
			usernameLastUpdatedAt: statusQuery.data.usernameLastUpdatedAt
				? new Date(statusQuery.data.usernameLastUpdatedAt)
				: null,
			canUpdate: statusQuery.data.canUpdate,
			nextAllowedAt: statusQuery.data.nextAllowedAt
				? new Date(statusQuery.data.nextAllowedAt)
				: null,
		});
	}, [statusQuery.data]);

	if (statusQuery.isPending) {
		return (
			<p className="text-muted-foreground text-sm">
				Loading username settings…
			</p>
		);
	}

	if (statusQuery.isError || !statusQuery.data) {
		return (
			<p className="text-destructive text-sm">
				Could not load username settings.
			</p>
		);
	}

	return (
		<form
			className="flex flex-col gap-4"
			onSubmit={(event) => {
				event.preventDefault();
				setFieldError(null);

				const parsed = UsernameInputSchema.safeParse({ username: trimmed });
				if (!parsed.success) {
					const message =
						parsed.error.issues[0]?.message ??
						"Enter a valid username (letters, numbers, underscores).";
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
				<FieldLabel htmlFor={fieldId}>Username</FieldLabel>
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
				Save username
			</LoadingButton>
		</form>
	);
}
